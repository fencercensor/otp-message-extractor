# OTP Message Extractor for JavaScript

[![npm version](https://img.shields.io/npm/v/otp-message-extractor.svg)](https://www.npmjs.com/package/otp-message-extractor)
[![CI](https://github.com/mahm0ud55/otp-message-extractor/actions/workflows/ci.yml/badge.svg)](https://github.com/mahm0ud55/otp-message-extractor/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Extract OTP, verification, security, 2FA, and MFA codes from Arabic or English SMS and email text.** This tiny, dependency-free JavaScript OTP parser detects 4–8 digit codes and alphanumeric codes, normalizes Arabic-Indic numerals, and avoids common false positives such as phone numbers and dates.

`JavaScript` · `Node.js` · `TypeScript types` · `Arabic + English` · `Zero dependencies`

```js
import { extractOTP } from 'otp-message-extractor';

extractOTP('Your verification code is 582914');
// { code: '582914', confidence: 0.98 }
```

## Why use an OTP message parser?

A basic OTP regex often returns the first number it sees. Real SMS messages may also contain a phone number, date, year, transaction reference, or more than one number. OTP Message Extractor ranks candidates using nearby phrases such as `verification code`, `security code`, `OTP`, `رمز التحقق`, and `كود التأكيد`, then returns the strongest match with a confidence score.

## Features

- Extracts numeric OTP codes containing 4 to 8 digits.
- Detects mixed alphanumeric verification codes such as `A8D-291`.
- Parses Arabic and English SMS, notification, and email-body text.
- Converts Arabic-Indic `٠١٢٣٤٥٦٧٨٩` and Eastern Arabic-Indic `۰۱۲۳۴۵۶۷۸۹` digits to `0-9`.
- Filters common phone-number and structured-date formats.
- Returns a deterministic confidence score for the best candidate.
- Includes TypeScript declarations.
- Has zero runtime dependencies and performs no network requests.

## Installation

```bash
npm install otp-message-extractor
```

Node.js 18 or newer is required.

## Quick start

### Extract a 6-digit OTP from an English SMS

```js
import extractOTP from 'otp-message-extractor';

extractOTP('Your verification code is 582914');
// { code: '582914', confidence: 0.98 }
```

### Extract an Arabic verification code

```js
extractOTP('رمز التحقق الخاص بك هو ٥٨٢٩١٤');
// { code: '582914', confidence: 0.98 }
```

### Extract an alphanumeric OTP

```js
extractOTP('Your verification code is A8D-291');
// { code: 'A8D-291', confidence: 0.96 }
```

### Ignore a phone number or date

```js
extractOTP('Call +20 10 1234 5678');
// null

extractOTP('The appointment date is 2026-08-03');
// null
```

### Select the OTP from a message with other numbers

```js
const message =
  'Call +20 10 1234 5678 before 03/08/2026. Your code is 739201.';

extractOTP(message);
// { code: '739201', confidence: 0.95 }
```

## Supported OTP formats

| Message or code type | Example | Result |
| --- | --- | --- |
| 4-digit PIN | `OTP: 4821` | `4821` |
| 6-digit verification code | `Your code is 582914` | `582914` |
| 8-digit security code | `Security code: 12345678` | `12345678` |
| Arabic-Indic digits | `رمز التحقق ٥٨٢٩١٤` | `582914` |
| Eastern Arabic-Indic digits | `کد تایید ۱۲۳۴۵۶` | `123456` |
| Alphanumeric code | `Code: A8D-291` | `A8D-291` |
| Structured date | `Date: 03/08/2026` | `null` |
| Phone number | `Phone: +20 10 1234 5678` | `null` |

## API

### `extractOTP(message)`

Accepts a string and returns the most likely OTP candidate or `null`.

```ts
interface OTPResult {
  code: string;
  confidence: number;
}

declare function extractOTP(message: string): OTPResult | null;
```

Arabic-Indic digits are normalized in `code`. `confidence` is a deterministic heuristic score from `0` to `0.99`; it is not a statistical probability. The function throws a `TypeError` when the input is not a string.

## Common use cases

- SMS OTP extraction in Node.js authentication services.
- Verification-code parsing in an SMS inbox or support dashboard.
- 2FA/MFA passcode highlighting and copy buttons.
- Parsing codes from email bodies or notification text.
- Authorized QA and end-to-end tests for sign-in and payment flows.
- Virtual-number and temporary-number inbox interfaces.
- Receive-SMS services that need to identify the likely code inside a message.

## Temporary-number and receive-SMS integrations

This package provides the message-parsing layer needed to build OTP highlighting or one-click copy experiences in virtual-number, temporary-number, and online SMS inbox products. It can power a similar **code extraction experience** to the one users expect from receive-SMS websites such as [Receive SMS Live](https://receive-smss.live/): pass the received message text to `extractOTP()` and display the returned code.

This project is independent and is **not affiliated with, endorsed by, or connected to Receive SMS Live**. It does not provide phone numbers, receive or fetch messages, access that website, or bypass account verification. Use it only with messages and systems you own or are authorized to process. Public/shared phone numbers should never be used for sensitive, financial, or personal accounts.

## OTP Message Extractor vs WebOTP and TOTP libraries

This package parses a message string you already have. It solves a different problem from:

- **WebOTP API:** asks a supported browser, with user consent, to obtain a specially formatted SMS and fill a verification form.
- **TOTP/HOTP libraries:** generate or verify time-based or counter-based one-time passwords using a secret.
- **SMS receiver libraries:** read messages from a device or connect to an SMS provider.

You can use this parser after your own authorized SMS provider, inbox, webhook, email service, or test harness supplies the message text.

## How extraction works

1. Normalizes Arabic-Indic digits without changing message offsets.
2. Marks common date and phone-number ranges as protected.
3. Finds numeric and alphanumeric OTP candidates.
4. Scores each candidate using OTP keywords, distance, format, and negative context.
5. Returns the highest-scoring candidate above the minimum confidence threshold.

The implementation is deterministic: the same input always produces the same output.

## FAQ

### How do I extract an OTP from an SMS in JavaScript?

Pass the SMS body to `extractOTP(message)`. The function returns `{ code, confidence }` or `null` when no strong candidate is found.

### Can it extract 4-digit, 6-digit, and 8-digit verification codes?

Yes. Numeric codes from 4 to 8 digits are supported, with 6-digit codes receiving a slightly stronger format score because they are common in verification messages.

### Can it parse Arabic OTP messages?

Yes. Arabic phrases and both Arabic-Indic numeral sets are supported. Returned digits are normalized to `0-9` for easier form filling and API use.

### Can it extract an OTP from an email?

Yes. Pass the email subject or plain-text body as a string. This package does not download or convert HTML email by itself.

### Does it read SMS messages automatically?

No. It only analyzes the string supplied by your application. Use an authorized device API, SMS provider, webhook, or inbox integration to obtain the text first.

### Does it generate or validate TOTP/HOTP codes?

No. It extracts a code displayed in text; it does not generate secrets or cryptographically validate a code.

### Is the confidence value a probability?

No. It is a transparent heuristic ranking score intended to help compare candidates inside the same message.

## العربية — مكتبة استخراج كود التحقق من الرسائل

`OTP Message Extractor` مكتبة JavaScript خفيفة ومن دون اعتماديات، مخصّصة لاستخراج رمز التحقق أو كود التأكيد من نصوص رسائل SMS والإشعارات والبريد الإلكتروني باللغة العربية أو الإنجليزية.

```js
import { extractOTP } from 'otp-message-extractor';

extractOTP('كود التأكيد الخاص بك هو ٤٨٢١');
// { code: '4821', confidence: 0.93 }
```

### ما الذي تدعمه المكتبة؟

- استخراج كود OTP رقمي من 4 إلى 8 أرقام.
- قراءة الأرقام العربية مثل `٥٨٢٩١٤` وإرجاعها بالشكل `582914`.
- استخراج الأكواد المختلطة من حروف وأرقام مثل `A8D-291`.
- تجاهل أرقام الهاتف والتواريخ المكتوبة بالصيغ الشائعة.
- اختيار الكود الأقرب لعبارات مثل «رمز التحقق»، «كود التأكيد»، «رمز الدخول»، و«كلمة المرور لمرة واحدة».
- العمل محليًا من دون إرسال الرسالة أو الكود إلى أي خدمة خارجية.

### مواقع استقبال SMS والأرقام المؤقتة

يمكن استخدام المكتبة لبناء طبقة تحليل الرسائل وإبراز كود التحقق داخل واجهات صناديق SMS أو مواقع الأرقام الافتراضية والمؤقتة، بما يشبه تجربة استخراج ونسخ الكود التي يتوقعها المستخدم في مواقع مثل [Receive SMS Live](https://receive-smss.live/). المشروع مستقل تمامًا ولا يتبع الموقع المذكور ولا يستقبل الرسائل أو يوفر أرقامًا مؤقتة بنفسه.

استخدم المكتبة فقط مع الأنظمة والرسائل التي تملكها أو لديك تصريح لمعالجتها، ولا تستخدم الأرقام العامة أو المشتركة للحسابات الحساسة أو البنكية أو الشخصية.

## Security and privacy

- Do not log message bodies or extracted OTPs in production.
- Process only messages you are authorized to access.
- Treat OTPs as secrets and discard them as soon as the verification flow finishes.
- This package runs locally and makes no network requests.
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Development

```bash
npm test
npm run check
```

## Contributing

Bug reports, real-world format descriptions, and pull requests are welcome. Never publish a real phone number, OTP, or private message in an issue. Use invented examples and add a test for every new format or false-positive fix. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
