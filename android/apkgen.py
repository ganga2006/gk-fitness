"""
Binary AndroidManifest.xml, a one-entry resources.arsc (the launcher icon),
an aligned APK zip and an APK Signature Scheme v2 signature — all written
directly, so no Android SDK, aapt or apksigner is needed.
"""
import hashlib
import struct
import zipfile
import io

ANDROID_NS = 'http://schemas.android.com/apk/res/android'

ATTR_ID = {
    'theme': 0x01010000, 'label': 0x01010001, 'icon': 0x01010002, 'name': 0x01010003,
    'exported': 0x01010010, 'launchMode': 0x0101001d, 'screenOrientation': 0x0101001e,
    'configChanges': 0x0101001f, 'minSdkVersion': 0x0101020c, 'versionCode': 0x0101021b,
    'versionName': 0x0101021c, 'targetSdkVersion': 0x01010270, 'allowBackup': 0x01010280,
    'hardwareAccelerated': 0x010102d3,
}

T_REF, T_STRING, T_INT_DEC, T_INT_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12


def _pool(strings, utf8=False):
    """ResStringPool chunk."""
    offs, body = [], bytearray()
    for s in strings:
        offs.append(len(body))
        if utf8:
            b = s.encode('utf-8')
            assert len(s) < 128 and len(b) < 128
            body += bytes([len(s), len(b)]) + b + b'\x00'
        else:
            u = s.encode('utf-16-le')
            body += struct.pack('<H', len(s)) + u + b'\x00\x00'
    while len(body) % 4:
        body.append(0)
    hdr = 28
    start = hdr + 4 * len(strings)
    size = start + len(body)
    out = struct.pack('<HHIIIIII', 0x0001, hdr, size, len(strings), 0, 0x100 if utf8 else 0, start, 0)
    out += b''.join(struct.pack('<I', o) for o in offs)
    return out + bytes(body)


class Node:
    def __init__(self, tag, attrs=None, children=None):
        self.tag, self.attrs, self.children = tag, attrs or [], children or []


def axml(root):
    """attrs: list of (name, android_ns?, kind, value) with kind in str/int/hex/bool/ref."""
    # attribute names with a resource id must come first, in the same order as the resource map
    res_names, other = [], []

    def walk(n):
        for (name, ns, kind, val) in n.attrs:
            if ns:
                if name not in res_names:
                    res_names.append(name)
            elif name not in other:
                other.append(name)
            if kind == 'str' and val not in other:
                other.append(val)
        if n.tag not in other:
            other.append(n.tag)
        for c in n.children:
            walk(c)
    walk(root)
    res_names.sort(key=lambda n: ATTR_ID[n])
    for s in ('android', ANDROID_NS):
        if s not in other:
            other.append(s)
    strings = res_names + [s for s in other if s not in res_names]
    si = {s: i for i, s in enumerate(strings)}

    chunks = bytearray()
    chunks += _pool(strings)
    rmap = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(res_names)) + b''.join(struct.pack('<I', ATTR_ID[n]) for n in res_names)
    chunks += rmap
    line = [1]
    chunks += struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xFFFFFFFF, si['android'], si[ANDROID_NS])

    def emit(n):
        attrs = []
        for (name, ns, kind, val) in n.attrs:
            nsi = si[ANDROID_NS] if ns else 0xFFFFFFFF
            raw = 0xFFFFFFFF
            if kind == 'str':
                raw = si[val]; typ, data = T_STRING, si[val]
            elif kind == 'int':
                typ, data = T_INT_DEC, val
            elif kind == 'hex':
                typ, data = T_INT_HEX, val
            elif kind == 'bool':
                typ, data = T_BOOL, 0xFFFFFFFF if val else 0
            elif kind == 'ref':
                typ, data = T_REF, val
            attrs.append((ATTR_ID.get(name, 0xFFFFFFFF) if ns else 0xFFFFFFFF, nsi, si[name], raw, typ, data))
        # sorted by resource id, as aapt does (the framework walks them in that order)
        attrs.sort(key=lambda a: a[0])
        body = struct.pack('<IIHHHHHH', 0xFFFFFFFF, si[n.tag], 20, 20, len(attrs), 0, 0, 0)
        for (_, nsi, ni, raw, typ, data) in attrs:
            body += struct.pack('<IIIHBBI', nsi, ni, raw, 8, 0, typ, data & 0xFFFFFFFF)
        line[0] += 1
        out = struct.pack('<HHIII', 0x0102, 16, 16 + len(body), line[0], 0xFFFFFFFF) + body
        for c in n.children:
            out += emit(c)
        line[0] += 1
        out += struct.pack('<HHIIIII', 0x0103, 16, 24, line[0], 0xFFFFFFFF, 0xFFFFFFFF, si[n.tag])
        return out

    chunks += emit(root)
    chunks += struct.pack('<HHIIIII', 0x0101, 16, 24, line[0] + 1, 0xFFFFFFFF, si['android'], si[ANDROID_NS])
    return struct.pack('<HHI', 0x0003, 8, 8 + len(chunks)) + bytes(chunks)


def arsc(package, type_name, entries):
    """One resource type, one nodpi config, file-path string values. entries = [(key, path)]."""
    gpool = _pool([p for _, p in entries], utf8=True)
    tpool = _pool([type_name])
    kpool = _pool([k for k, _ in entries])
    n = len(entries)
    spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4 * n, 1, 0, 0, n) + b'\x00' * (4 * n)
    config = bytearray(64)
    struct.pack_into('<I', config, 0, 64)
    struct.pack_into('<H', config, 14, 0xFFFF)          # density = nodpi
    thdr = 8 + 1 + 1 + 2 + 4 + 4 + 64
    entries_start = thdr + 4 * n
    ebody = bytearray()
    offs = []
    for i in range(n):
        offs.append(len(ebody))
        ebody += struct.pack('<HHI', 8, 0, i)                   # ResTable_entry: key i
        ebody += struct.pack('<HBBI', 8, 0, T_STRING, i)        # Res_value: global string i
    ttype = struct.pack('<HHIBBHII', 0x0201, thdr, entries_start + len(ebody), 1, 0, 0, n, entries_start) + bytes(config)
    ttype += b''.join(struct.pack('<I', o) for o in offs) + bytes(ebody)
    name = package.encode('utf-16-le').ljust(256, b'\x00')
    phdr = 288
    pbody = tpool + kpool + spec + ttype
    pkg = struct.pack('<HHII', 0x0200, phdr, phdr + len(pbody), 0x7F) + name
    pkg += struct.pack('<IIIII', phdr, 1, phdr + len(tpool), n, 0)
    assert len(pkg) == phdr
    pkg += pbody
    body = gpool + pkg
    return struct.pack('<HHII', 0x0002, 12, 12 + len(body), 1) + body


# ---------------- zip with 4-byte alignment for stored entries ----------------

def write_zip(path, files):
    """files: list of (name, bytes, compress). Stored entries are aligned to 4 bytes (zipalign)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        for name, data, comp in files:
            zi = zipfile.ZipInfo(name, date_time=(2026, 11, 4, 0, 0, 0))
            zi.external_attr = 0o644 << 16
            zi.create_system = 0
            if comp:
                zi.compress_type = zipfile.ZIP_DEFLATED
            else:
                zi.compress_type = zipfile.ZIP_STORED
                # local header = 30 + len(name) + len(extra); pad so the data starts on a 4-byte boundary
                hdr_end = buf.tell() + 30 + len(name.encode())
                pad = (-hdr_end) % 4
                if pad:
                    pad = pad if pad >= 4 else pad + 4  # an extra field needs at least 4 bytes
                    zi.extra = struct.pack('<HH', 0xD935, pad - 4) + b'\x00' * (pad - 4)
            z.writestr(zi, data)
    raw = buf.getvalue()
    open(path, 'wb').write(raw)
    return raw


# ---------------- APK Signature Scheme v2 ----------------

def _lp(b):
    return struct.pack('<I', len(b)) + b


def _chunk_digest(sections):
    chunks = []
    for s in sections:
        for i in range(0, len(s), 1 << 20):
            c = s[i:i + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()


def sign_v2(apk, key, cert_der):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    eocd = apk.rfind(b'PK\x05\x06')
    cd_off = struct.unpack('<I', apk[eocd + 16:eocd + 20])[0]
    before, cd, eocd_b = apk[:cd_off], apk[cd_off:eocd], bytearray(apk[eocd:])
    digest = _chunk_digest([before, cd, bytes(eocd_b)])   # EOCD already points at cd_off == signing block start
    ALG = 0x0103  # RSASSA-PKCS1-v1_5 with SHA2-256
    signed_data = _lp(_lp(struct.pack('<I', ALG) + _lp(digest))) + _lp(_lp(cert_der)) + _lp(b'')
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = _lp(signed_data) + _lp(_lp(struct.pack('<I', ALG) + _lp(sig))) + _lp(pub)
    v2 = _lp(_lp(signer))
    pair = struct.pack('<Q', 4 + len(v2)) + struct.pack('<I', 0x7109871A) + v2
    size = len(pair) + 8 + 16
    block = struct.pack('<Q', size) + pair + struct.pack('<Q', size) + b'APK Sig Block 42'
    struct.pack_into('<I', eocd_b, 16, cd_off + len(block))
    return before + block + cd + bytes(eocd_b)
