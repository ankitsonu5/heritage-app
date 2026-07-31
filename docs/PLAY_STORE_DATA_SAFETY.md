# Google Play Data Safety — Heritage Diagnostics

Prepared for app version **1.2** (`versionCode 3`) on **31 July 2026**. This is a Play Console entry guide based on the current repository. Re-check it whenever app features, SDKs, hosting, SMS/email providers, or data practices change.

## Data collection and security

Use these initial answers in **Play Console → Policy and programs → App content → Data safety**:

| Play Console question | Answer |
|---|---|
| Does the app collect or share required user data types? | **Yes** |
| Is all collected user data encrypted in transit? | **Yes** — production traffic uses HTTPS |
| Is user data shared with third parties? | **No**, provided service providers act only as processors on Heritage Diagnostics' behalf and data is not transferred for their independent use or advertising |
| Does the app provide a way to request data deletion? | **Not yet — select No until both the in-app route and public deletion web page are live and functional** |
| Does the app allow users to create an account? | **Yes** |
| Independent security review | **No**, unless a qualifying published review has actually been completed |

Google's definition of "shared" has exceptions for service providers processing data on the developer's behalf. Confirm each vendor contract and actual use before selecting **No**.

## Data types to declare

For every item below select **Collected: Yes** and **Shared: No** under the current implementation.

| Google Play category | Data type | Required or optional | Purposes to select |
|---|---|---|---|
| Personal info | Name | Required for patient/staff accounts | App functionality; Account management |
| Personal info | Phone number | Required | App functionality; Account management; Developer communications |
| Personal info | User IDs | Required (patient/staff database and login identifiers) | App functionality; Account management; Security/fraud prevention |
| Personal info | Address | Required for home collection | App functionality |
| Personal info | Other info | Age (optional) and city/village (required) | App functionality; Account management |
| Health and fitness | Health info | Optional until a diagnostic order is submitted | App functionality |
| Photos and videos | Photos | Optional; user chooses camera/gallery prescription upload | App functionality |
| Files and docs | Files and docs | Optional; prescription PDFs and diagnostic reports | App functionality |
| Financial info | Purchase history | Optional; diagnostic order amount, payment mode and payment status | App functionality; Fraud prevention/security |
| Device or other IDs | Device or other IDs | Optional for notifications | App functionality; Developer communications |

### Health information includes

- prescription images/PDFs;
- selected or prescribed tests;
- sample-collection and laboratory workflow data;
- diagnostic reports and order history.

### Financial information limitation

The app records order amount, payment mode, and collection status. It does **not** currently collect card numbers, bank-account credentials, UPI PINs, credit information, or other financial credentials. Do not select **Payment info** unless an in-app payment SDK or payment credentials are later added.

### Firebase Cloud Messaging

The app uses Firebase Cloud Messaging. Firebase Messaging/Installations processes app version, Firebase installation ID, and basic app/device metadata to deliver notifications. Declare **Device or other IDs**. The repository does not currently include Firebase Analytics or Crashlytics; do not select analytics/crash categories solely because Firebase Messaging is present.

## Data the app does not currently collect

Do not select these unless implementation changes:

- email address;
- precise or approximate device location/GPS;
- contacts;
- SMS or call logs;
- audio/voice recordings;
- web browsing history;
- advertising data;
- card, bank-account, UPI PIN, credit-score, or other payment credentials;
- race/ethnicity, political or religious beliefs, sexual orientation, or biometric identifiers.

The `tel:` Call PRO action opens the device dialler. The app does not request Call Log permission and does not read call history.

## Retention and deletion answer

The current app allows account creation but does not yet provide an in-app account-deletion path. Google Play requires both an in-app path and a functional external web resource for apps that create accounts. Before production submission:

1. Add **Delete account / Request account deletion** in the patient's Profile screen.
2. Publish a public HTTPS deletion page referencing Heritage Diagnostics.
3. Provide a request form or email link that works without reinstalling the app.
4. Implement a verified backend process that deletes or anonymises eligible account data.
5. Clearly disclose any records retained for medical, tax, fraud-prevention, or legal obligations.
6. Only then change the Data Safety deletion answer to **Yes** and enter the public URL.

## Play Console consistency checklist

- Privacy Policy URL must be public, HTTPS, accessible without login, and not a local/GitHub repository file path.
- Put the same privacy policy link inside the app.
- Ensure the policy names **Heritage Diagnostics** exactly as the Play Store listing does.
- Complete the separate **Health apps declaration**; this app provides diagnostic/laboratory and health-service functionality.
- Disclose all active SDKs and service providers, including any later-added analytics, crash reporting, payment, SMS, or advertising SDK.
- Re-test the public policy and deletion URLs in an incognito browser before submission.

## Suggested Health apps declaration description

> Heritage Diagnostics enables users to submit prescriptions, request diagnostic tests and home sample collection, track laboratory order status, and receive diagnostic reports. The app supports service coordination and report delivery; it does not independently diagnose conditions, prescribe treatment, or provide emergency medical services.

