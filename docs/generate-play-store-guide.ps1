$ErrorActionPreference = 'Stop'

$outputPath = Join-Path $PSScriptRoot 'Heritage-Diagnostics-Play-Store-Guide.docx'
$iconPath = Join-Path (Split-Path $PSScriptRoot) 'store-assets\play-store\app-icon-512.png'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$document = $word.Documents.Add()
$selection = $word.Selection

function Add-Heading([string]$text, [int]$level = 1) {
    $selection.Style = "Heading $level"
    $selection.TypeText($text)
    $selection.TypeParagraph()
}

function Add-Text([string]$text) {
    $selection.Style = 'Normal'
    $selection.TypeText($text)
    $selection.TypeParagraph()
}

function Add-Check([string]$text) {
    Add-Text("[ ] $text")
}

try {
    if (Test-Path $iconPath) {
        $shape = $selection.InlineShapes.AddPicture($iconPath)
        $shape.Width = 90
        $shape.Height = 90
        $selection.TypeParagraph()
    }

    $selection.Style = 'Title'
    $selection.TypeText('Heritage Diagnostics')
    $selection.TypeParagraph()
    $selection.Style = 'Subtitle'
    $selection.TypeText('Google Play Store Publishing Guide')
    $selection.TypeParagraph()
    Add-Text('Project-specific step-by-step checklist | Version 1.2 (Code 3) | Updated 1 August 2026')

    Add-Heading 'Quick order: pehle kya, phir kya'
    Add-Text('1. Policy pages ko GitHub par push karein. 2. Render deploy complete hone dein. 3. Dono HTTPS URLs browser mein check karein. 4. Play Console mein app create karein. 5. Store listing aur App Content forms bharein. 6. AAB ko Internal testing mein upload karein. 7. Real phone par testing karein. 8. Zarurat ho to 12 testers ke saath 14-day Closed test complete karein. 9. Production access lekar final release submit karein.')

    Add-Heading '1. Aapke project ki ready information'
    Add-Text('App name: Heritage Diagnostics')
    Add-Text('Package name: com.heritagediagnostics')
    Add-Text('Version name: 1.2')
    Add-Text('Version code: 3')
    Add-Text('Production API: https://dapp.heritageimshospital.com/api/')
    Add-Text('AAB file: heritagediagnostics/android/app/build/outputs/bundle/release/app-release.aab')
    Add-Text('Important: Play Store mein APK nahi, signed .aab file upload karni hai. APK sirf mobile testing ke liye rakhein.')

    Add-Heading '2. Play Console account ready karein'
    Add-Check('play.google.com/console par developer account create/login karein.')
    Add-Check('Heritage Diagnostics health service hai, isliye Organization account choose karein.')
    Add-Check('Organization verification ke liye legal business details, website aur D-U-N-S number ready rakhein.')
    Add-Check('Developer email aur phone verify karein. Public support email baad mein Store Listing par dikhega.')
    Add-Check('Agar console device verification maange, Play Console mobile app se real Android phone verify karein.')

    Add-Heading '3. Play Console mein app create karein'
    Add-Text('Play Console > All apps > Create app')
    Add-Check('App name: Heritage Diagnostics')
    Add-Check('Default language: English (India)')
    Add-Check('App or game: App')
    Add-Check('Free or paid: Free, agar app download ke liye charge nahi lena hai.')
    Add-Check('Support email enter karein aur declarations accept karein.')
    Add-Check('Create app select karein.')

    Add-Heading '4. Main Store Listing complete karein'
    Add-Text('Grow users > Store presence > Main store listing')
    Add-Text('App name: Heritage Diagnostics')
    Add-Text('Short description (74/80): Book diagnostic tests, home sample collection and access reports securely.')
    Add-Text('Full description mein services, prescription upload, sample collection, order tracking aur report access explain karein. Unverified medical claims ya "best/guaranteed" jaise words avoid karein.')
    Add-Check('App icon upload: store-assets/play-store/app-icon-512.png')
    Add-Check('Feature graphic upload: store-assets/play-store/feature-graphic-1024x500.png')
    Add-Check('Patient login and dashboard screenshots upload karein.')
    Add-Check('Staff login screenshot upload karein; error popup ya credentials wala screenshot upload na karein.')
    Add-Check('Category: Medical select karein.')
    Add-Check('Support email, website and phone add karein.')

    Add-Heading '5. Privacy Policy aur Account Deletion URL'
    Add-Text('Repository documents: docs/PRIVACY_POLICY.md, docs/ACCOUNT_DELETION.md aur docs/PLAY_STORE_DATA_SAFETY.md')
    Add-Text('Public pages project mein ready hain: backend/public/privacy-policy.html aur backend/public/account-deletion.html')
    Add-Text('Terminal mein ek-ek karke chalayein:')
    Add-Text('git add backend/src/app.js backend/public')
    Add-Text('git commit -m "Add privacy policy and account deletion pages"')
    Add-Text('git push')
    Add-Check('Git push ke baad Render dashboard mein backend service ka deploy Live hone dein.')
    Add-Check('Browser mein https://dapp.heritageimshospital.com/privacy-policy open karke check karein.')
    Add-Check('Browser mein https://dapp.heritageimshospital.com/account-deletion open karke check karein.')
    Add-Check('Dono pages bina login, bina Cannot GET error, public HTTPS par open hone chahiye.')
    Add-Check('Play Console > Policy and programs > App content mein Privacy Policy URL enter karein.')
    Add-Text('Privacy Policy URL: https://dapp.heritageimshospital.com/privacy-policy')
    Add-Text('Account Deletion URL: https://dapp.heritageimshospital.com/account-deletion')
    Add-Text('BLOCKER: Render deploy ke baad URLs live verify kiye bina final submission na karein.')

    Add-Heading '6. App Content declarations'
    Add-Text('Policy and programs > App content mein har section complete karein:')
    Add-Check('Ads: "No" select karein, agar app mein advertising SDK/ads nahi hain.')
    Add-Check('App access: Login required select karein aur Google reviewer ke liye working demo patient/staff credentials aur clear steps dein.')
    Add-Check('Target audience: Actual adult healthcare users ke according select karein; children ko target na karein agar app unke liye designed nahi hai.')
    Add-Check('Content rating questionnaire accurately complete karein.')
    Add-Check('News app: No, agar applicable nahi hai.')
    Add-Check('Health apps declaration: Diagnostic/health functionality aur applicable features accurately declare karein.')
    Add-Check('Data Safety form ko docs/PLAY_STORE_DATA_SAFETY.md se fill karein, lekin final answers current app behaviour/SDKs se match hone chahiye.')

    Add-Heading '7. Data Safety mein dhyan dene wale data types'
    Add-Text('App patient information, phone/login data, prescription/report files, camera/gallery uploads, notifications/push token aur order/diagnostic information process kar sakti hai. Collection, sharing, encryption in transit, deletion request aur purpose ke answers bilkul actual backend behaviour ke according dein.')
    Add-Check('HTTPS in transit enabled verify karein.')
    Add-Check('Firebase/notification aur kisi third-party SDK ke data collection ko include karein.')
    Add-Check('Account deletion frontend aur backend dono se working verify karein.')
    Add-Check('Privacy Policy ke statements aur Data Safety answers identical behaviour describe karein.')

    Add-Heading '8. Internal testing release'
    Add-Text('Test and release > Testing > Internal testing > Create new release')
    Add-Check('Play App Signing enable/accept karein.')
    Add-Check('Signed app-release.aab upload karein.')
    Add-Check('Release name: Heritage Diagnostics 1.2 (3)')
    Add-Check('Release notes add karein: Initial production release with test booking, home sample collection, tracking and reports.')
    Add-Check('Save > Review release > Start rollout to Internal testing.')
    Add-Check('Tester Gmail IDs add karein aur opt-in link share karein.')
    Add-Check('Play Store se install karke login, registration, prescription upload, camera/gallery, call button, notification sound, logout, reports and deletion test karein.')

    Add-Heading '9. Closed testing rule'
    Add-Text('Agar Personal developer account 13 November 2023 ke baad create hua hai, minimum 12 opted-in testers ko 14 continuous days closed test mein rakhna hota hai. Requirement complete hone ke baad Dashboard se Apply for production karein. Organization account par console jo requirement dikhaye usko follow karein.')
    Add-Check('Closed testing track create karein aur AAB promote/upload karein.')
    Add-Check('Kam se kam 12 testers continuously opted-in rakhein; beech mein opt-out na hone dein.')
    Add-Check('Feedback record karein aur bugs/fixes note karein; production access application mein ye details maangi jaati hain.')

    Add-Heading '10. Production release'
    Add-Text('Test and release > Production > Create new release')
    Add-Check('Tested AAB choose/upload karein.')
    Add-Check('Countries/regions select karein; initial launch ke liye India select kiya ja sakta hai.')
    Add-Check('Pre-launch report ke crashes, ANRs, security aur compatibility issues review karein.')
    Add-Check('App content, Data Safety, Privacy Policy, store listing aur reviewer access ke pending errors clear karein.')
    Add-Check('Review release > Start rollout to Production > Submit for review.')
    Add-Text('Review ke dauran backend/API live rakhein aur reviewer credentials expire/delete na karein.')

    Add-Heading '11. Final go-live checklist'
    Add-Check('Production API health endpoint working hai.')
    Add-Check('MongoDB/network allow-list aur backend hosting stable hai.')
    Add-Check('No localhost, LAN IP, test credentials or secret keys app/repository mein exposed nahi hain.')
    Add-Check('Patient delete hone ke baad login blocked aur archive behaviour verified hai.')
    Add-Check('Call PRO/Agent number admin-configured value hi dikhata hai.')
    Add-Check('Push notification permission, channel and sound real Android device par verified hai.')
    Add-Check('Camera/gallery permission denial gracefully handle hota hai.')
    Add-Check('Privacy Policy and account deletion public URLs open ho rahe hain.')
    Add-Check('Signing keystore ka encrypted backup aur passwords safely stored hain.')
    Add-Check('Next update mein versionCode 3 se bada hoga; same versionCode dobara upload nahi hoga.')

    Add-Heading '12. Official Google references'
    Add-Text('Create/set up app: https://support.google.com/googleplay/android-developer/answer/9859152')
    Add-Text('Testing requirement: https://support.google.com/googleplay/android-developer/answer/14151465')
    Add-Text('Internal/closed testing: https://support.google.com/googleplay/android-developer/answer/9845334')
    Add-Text('Developer account type: https://support.google.com/googleplay/android-developer/answer/13634885')
    Add-Text('Device verification: https://support.google.com/googleplay/android-developer/answer/14316361')

    $document.SaveAs2($outputPath, 16)
}
finally {
    $document.Close()
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($selection) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

Write-Output $outputPath
