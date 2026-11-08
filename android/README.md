# GK Fitness — Android APK

`GK-Fitness.apk` (in the project folder) is the whole app: the web build inlined
into one page, the 3D model, and a small native shell (a full-screen WebView
plus a bridge to the phone's own text-to-speech for the voice coach).

## Install on your phone
1. Copy `GK-Fitness.apk` to the phone (USB, Drive, WhatsApp to yourself…).
2. Open it. Android asks to allow installs from that app (Files / Chrome) — allow it.
3. Tap **Install**. Play Protect may warn that it's from an unknown developer; choose
   *More details → Install anyway*. That is expected for any app not from the Play Store.

Needs Android 7.0 or newer. Portrait only. The screen stays on while the app is open.

## Rebuild after changing the app
No Android Studio or SDK is needed — only Node and Python 3 with `pillow` and `cryptography`.

```bash
npx vite build -c vite.apk.config.ts          # → dist-apk/index.html (single file)
python android/build_apk.py dist-apk GK-Fitness.apk android/signing
```

Every update **must be signed with the same key** (`android/signing/`), or the phone
will refuse to install it over the old version. Keep that folder private and backed up.
Bump `VERSION_CODE` in `android/build_apk.py` for each new release.

## What's inside
- `shell.py` — the two native classes: `MainActivity` (WebView, file access for
  `file:///android_asset/`, back button walks the app's own history, keep-screen-on)
  and `Tts` (`window.GKNative.speak/stop/setRate/setPitch`).
- `dexgen.py` — writes those classes as `classes.dex`.
- `apkgen.py` — binary manifest, launcher-icon resource table, aligned zip, v2 signature.
