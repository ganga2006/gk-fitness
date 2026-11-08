"""The two classes of the GK Fitness Android shell, written as DEX instructions."""
from dexgen import Dex, Class, Method, M, F

PKG = 'Lcom/gk/fitness/'
ACT = PKG + 'MainActivity;'
TTS = PKG + 'Tts;'
A = 'Landroid/app/Activity;'
WV = 'Landroid/webkit/WebView;'
WS = 'Landroid/webkit/WebSettings;'
CTX = 'Landroid/content/Context;'
SP = 'Landroid/speech/tts/TextToSpeech;'
STR = 'Ljava/lang/String;'
OBJ = 'Ljava/lang/Object;'
JSI = 'Landroid/webkit/JavascriptInterface;'


def build():
    d = Dex()

    # ---------------- MainActivity ----------------
    act = d.add(Class(ACT, A))
    act.fields.append(('w', WV, 0x2))
    act.methods.append(Method(ACT, '<init>', 'V', [], 0x10001, 1, 1, 1, [
        ('invoke-direct', M(A, '<init>', 'V'), [0]),
        ('return-void',),
    ]))
    # registers: v0..v3 locals, v4 = this, v5 = bundle
    act.methods.append(Method(ACT, 'onCreate', 'V', ['Landroid/os/Bundle;'], 0x4, 6, 2, 3, [
        ('invoke-super', M(A, 'onCreate', 'V', 'Landroid/os/Bundle;'), [4, 5]),
        ('const/4', 0, 1),
        # no title bar: the web app draws its own header
        ('invoke-virtual', M(A, 'requestWindowFeature', 'Z', 'I'), [4, 0]),
        # keep the screen on while the app is open (the workout timer runs hands-free)
        ('invoke-virtual', M(A, 'getWindow', 'Landroid/view/Window;'), [4]),
        ('move-result-object', 3),
        ('const/16', 2, 0x80),                      # FLAG_KEEP_SCREEN_ON
        ('invoke-virtual', M('Landroid/view/Window;', 'addFlags', 'V', 'I'), [3, 2]),
        ('new-instance', 1, ('t', WV)),
        ('invoke-direct', M(WV, '<init>', 'V', CTX), [1, 4]),
        ('iput-object', 1, 4, F(ACT, 'w', WV)),
        ('invoke-virtual', M(WV, 'getSettings', WS), [1]),
        ('move-result-object', 2),
        ('invoke-virtual', M(WS, 'setJavaScriptEnabled', 'V', 'Z'), [2, 0]),
        ('invoke-virtual', M(WS, 'setDomStorageEnabled', 'V', 'Z'), [2, 0]),
        ('invoke-virtual', M(WS, 'setDatabaseEnabled', 'V', 'Z'), [2, 0]),
        ('invoke-virtual', M(WS, 'setAllowFileAccess', 'V', 'Z'), [2, 0]),
        ('invoke-virtual', M(WS, 'setAllowFileAccessFromFileURLs', 'V', 'Z'), [2, 0]),
        ('invoke-virtual', M(WS, 'setAllowUniversalAccessFromFileURLs', 'V', 'Z'), [2, 0]),
        ('const/4', 3, 0),
        ('invoke-virtual', M(WS, 'setMediaPlaybackRequiresUserGesture', 'V', 'Z'), [2, 3]),
        # window.GKNative -> the phone's text-to-speech
        ('new-instance', 2, ('t', TTS)),
        ('invoke-direct', M(TTS, '<init>', 'V', CTX), [2, 4]),
        ('const-string', 3, ('s', 'GKNative')),
        ('invoke-virtual', M(WV, 'addJavascriptInterface', 'V', OBJ, STR), [1, 2, 3]),
        ('invoke-virtual', M(A, 'setContentView', 'V', 'Landroid/view/View;'), [4, 1]),
        ('const-string', 3, ('s', 'file:///android_asset/index.html')),
        ('invoke-virtual', M(WV, 'loadUrl', 'V', STR), [1, 3]),
        ('return-void',),
    ]))
    # back button walks the app's own screen history before leaving
    act.methods.append(Method(ACT, 'onBackPressed', 'V', [], 0x1, 3, 1, 1, [
        ('iget-object', 0, 2, F(ACT, 'w', WV)),
        ('if-eqz', 0, 'leave'),
        ('invoke-virtual', M(WV, 'canGoBack', 'Z'), [0]),
        ('move-result', 1),
        ('if-eqz', 1, 'leave'),
        ('invoke-virtual', M(WV, 'goBack', 'V'), [0]),
        ('return-void',),
        ('label', 'leave'),
        ('invoke-super', M(A, 'onBackPressed', 'V'), [2]),
        ('return-void',),
    ]))
    # pause/resume the WebView with the activity so audio and timers behave
    act.methods.append(Method(ACT, 'onDestroy', 'V', [], 0x4, 2, 1, 1, [
        ('iget-object', 0, 1, F(ACT, 'w', WV)),
        ('if-eqz', 0, 'done'),
        ('invoke-virtual', M(WV, 'destroy', 'V'), [0]),
        ('label', 'done'),
        ('invoke-super', M(A, 'onDestroy', 'V'), [1]),
        ('return-void',),
    ]))

    # ---------------- Tts bridge ----------------
    tts = d.add(Class(TTS, OBJ))
    tts.fields.append(('t', SP, 0x2))
    tts.methods.append(Method(TTS, '<init>', 'V', [CTX], 0x10001, 4, 2, 3, [
        ('invoke-direct', M(OBJ, '<init>', 'V'), [2]),
        ('new-instance', 0, ('t', SP)),
        ('const/4', 1, 0),
        ('invoke-direct', M(SP, '<init>', 'V', CTX, 'Landroid/speech/tts/TextToSpeech$OnInitListener;'), [0, 3, 1]),
        ('iput-object', 0, 2, F(TTS, 't', SP)),
        ('return-void',),
    ]))
    # speak(text, queueMode): v0..v2 locals, v3 this, v4 text, v5 mode
    tts.methods.append(Method(TTS, 'speak', 'V', [STR, 'I'], 0x1, 6, 3, 5, [
        ('iget-object', 0, 3, F(TTS, 't', SP)),
        ('const/4', 1, 0),
        ('const-string', 2, ('s', 'gk')),
        ('invoke-virtual', M(SP, 'speak', 'I', 'Ljava/lang/CharSequence;', 'I', 'Landroid/os/Bundle;', STR), [0, 4, 5, 1, 2]),
        ('return-void',),
    ], annotate=True))
    tts.methods.append(Method(TTS, 'stop', 'V', [], 0x1, 2, 1, 1, [
        ('iget-object', 0, 1, F(TTS, 't', SP)),
        ('invoke-virtual', M(SP, 'stop', 'I'), [0]),
        ('return-void',),
    ], annotate=True))
    tts.methods.append(Method(TTS, 'setRate', 'V', ['F'], 0x1, 3, 2, 2, [
        ('iget-object', 0, 1, F(TTS, 't', SP)),
        ('invoke-virtual', M(SP, 'setSpeechRate', 'I', 'F'), [0, 2]),
        ('return-void',),
    ], annotate=True))
    # setLang('te-IN'): the voice coach speaks Telugu with the phone's own Telugu voice
    tts.methods.append(Method(TTS, 'setLang', 'V', [STR], 0x1, 4, 2, 2, [
        ('iget-object', 0, 2, F(TTS, 't', SP)),
        ('invoke-static', M('Ljava/util/Locale;', 'forLanguageTag', 'Ljava/util/Locale;', STR), [3]),
        ('move-result-object', 1),
        ('invoke-virtual', M(SP, 'setLanguage', 'I', 'Ljava/util/Locale;'), [0, 1]),
        ('return-void',),
    ], annotate=True))
    tts.methods.append(Method(TTS, 'setPitch', 'V', ['F'], 0x1, 3, 2, 2, [
        ('iget-object', 0, 1, F(TTS, 't', SP)),
        ('invoke-virtual', M(SP, 'setPitch', 'I', 'F'), [0, 2]),
        ('return-void',),
    ], annotate=True))
    return d.build(annotation_type=JSI)


if __name__ == '__main__':
    import sys
    open(sys.argv[1], 'wb').write(build())
