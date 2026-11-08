"""
Builds GK-Fitness.apk from the single-file web build in gkfit/dist-apk.

    python3 build_apk.py <dist-apk dir> <out.apk> <keystore dir>
"""
import datetime
import io
import os
import sys

from PIL import Image
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

import shell
from apkgen import Node, axml, arsc, write_zip, sign_v2

PACKAGE = 'com.gk.fitness'
VERSION_CODE, VERSION_NAME = 4, '1.3.0'


def manifest():
    s = lambda n, v: (n, True, 'str', v)
    return Node('manifest', [('package', False, 'str', PACKAGE), ('versionCode', True, 'int', VERSION_CODE), s('versionName', VERSION_NAME)], [
        Node('uses-sdk', [('minSdkVersion', True, 'int', 24), ('targetSdkVersion', True, 'int', 34)]),
        Node('uses-permission', [s('name', 'android.permission.VIBRATE')]),
        # Android 11+ hides other apps unless declared: the phone's TTS engine must be visible
        Node('queries', [], [Node('intent', [], [Node('action', [s('name', 'android.intent.action.TTS_SERVICE')])])]),
        Node('application', [s('label', 'GK Fitness'), ('icon', True, 'ref', 0x7F010000),
                             ('hardwareAccelerated', True, 'bool', True), ('allowBackup', True, 'bool', True)], [
            Node('activity', [s('name', PACKAGE + '.MainActivity'), ('exported', True, 'bool', True),
                              ('launchMode', True, 'int', 2),            # singleTask
                              ('screenOrientation', True, 'int', 1),     # portrait
                              ('configChanges', True, 'hex', 0x0FB0)], [  # keyboard|keyboardHidden|orientation|screenLayout|uiMode|screenSize|smallestScreenSize
                Node('intent-filter', [], [
                    Node('action', [s('name', 'android.intent.action.MAIN')]),
                    Node('category', [s('name', 'android.intent.category.LAUNCHER')]),
                ]),
            ]),
        ]),
    ])


def key_and_cert(d):
    os.makedirs(d, exist_ok=True)
    kp, cp = os.path.join(d, 'gk-fitness-release-key.pem'), os.path.join(d, 'gk-fitness-release-cert.der')
    if os.path.exists(kp) and os.path.exists(cp):
        key = serialization.load_pem_private_key(open(kp, 'rb').read(), None)
        return key, open(cp, 'rb').read()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'GK Fitness'),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'GK Fitness')])
    now = datetime.datetime(2026, 11, 1, tzinfo=datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=365 * 30)).sign(key, hashes.SHA256()))
    der = cert.public_bytes(serialization.Encoding.DER)
    open(kp, 'wb').write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    open(cp, 'wb').write(der)
    return key, der


def main(dist, out, keydir):
    icon = io.BytesIO()
    Image.open(os.path.join(dist, 'icon-512.png')).convert('RGBA').resize((192, 192), Image.LANCZOS).save(icon, 'PNG', optimize=True)
    files = [
        ('AndroidManifest.xml', axml(manifest()), True),
        ('classes.dex', shell.build(), True),
        # Android 11+ requires resources.arsc stored and 4-byte aligned
        ('resources.arsc', arsc(PACKAGE, 'drawable', [('ic_launcher', 'res/drawable/ic_launcher.png')]), False),
        ('res/drawable/ic_launcher.png', icon.getvalue(), False),
    ]
    for root, _, names in os.walk(dist):
        for n in sorted(names):
            full = os.path.join(root, n)
            rel = os.path.relpath(full, dist).replace(os.sep, '/')
            if rel.endswith('.glb.txt') or rel in ('sw.js',):
                continue          # base64 copy of the model and the web service worker aren't needed in the app
            files.append(('assets/' + rel, open(full, 'rb').read(), not rel.endswith('.png')))
    raw = write_zip(out + '.unsigned', files)
    key, cert = key_and_cert(keydir)
    open(out, 'wb').write(sign_v2(raw, key, cert))
    os.remove(out + '.unsigned')
    print('wrote', out, os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main(*sys.argv[1:4])
