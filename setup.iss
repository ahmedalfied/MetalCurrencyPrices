; ==========================================================================
;  Inno Setup Script - MetalCurrencyPrices
;  يوزّع تطبيق سطح المكتب الرسومي (GUI) المبنى بواسطة build-package.mjs
;  المصدر: مجلد dist\MetalCurrencyPrices-win32-x64
; ==========================================================================

[Setup]
AppName=MetalCurrencyPrices
AppVersion=1.0.0
AppPublisher=MetalCurrencyPrices
DefaultDirName=C:\Program Files\MetalCurrencyPrices
DefaultGroupName=MetalCurrencyPrices
OutputDir=Output
OutputBaseFilename=MetalCurrencyPrices-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
DisableWelcomePage=yes
UninstallDisplayIcon={app}\MetalCurrencyPrices.exe

[Languages]
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"

[Files]
; نسخ كل محتويات التطبيق المبنى (بما فيها resources/app.asar)
Source: "dist\MetalCurrencyPrices-win32-x64\*"; DestDir: "{app}"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; اختصار في قائمة ابدأ
Name: "{group}\MetalCurrencyPrices"; Filename: "{app}\MetalCurrencyPrices.exe"
; اختصار على سطح المكتب
Name: "{group}\إلغاء التثبيت"; Filename: "{uninstallexe}"
Name: "{commondesktop}\MetalCurrencyPrices"; Filename: "{app}\MetalCurrencyPrices.exe"

[Run]
Filename: "{app}\MetalCurrencyPrices.exe"; \
  Description: "تشغيل MetalCurrencyPrices الآن"; \
  Flags: nowait postinstall skipifsilent
