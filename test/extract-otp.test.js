import test from 'node:test';
import assert from 'node:assert/strict';

import extractOTP, { extractOTP as namedExtractOTP } from '../src/index.js';

test('extracts a six-digit English verification code', () => {
  assert.deepEqual(extractOTP('Your verification code is 582914'), {
    code: '582914',
    confidence: 0.98,
  });
});

test('exports the same function as a named export', () => {
  assert.equal(namedExtractOTP, extractOTP);
});

test('extracts Arabic messages and normalizes Arabic-Indic digits', () => {
  const result = extractOTP('رمز التحقق الخاص بك هو ٥٨٢٩١٤');
  assert.equal(result?.code, '582914');
  assert.ok(result.confidence >= 0.9);
});

test('supports Eastern Arabic-Indic digits', () => {
  assert.equal(extractOTP('کد تایید: ۱۲۳۴۵۶')?.code, '123456');
});

test('extracts mixed alphanumeric codes', () => {
  const result = extractOTP('Your verification code is A8D-291');
  assert.equal(result?.code, 'A8D-291');
  assert.ok(result.confidence >= 0.9);
});

test('supports numeric codes from four to eight digits', () => {
  assert.equal(extractOTP('OTP: 4821')?.code, '4821');
  assert.equal(extractOTP('Security code: 12345678')?.code, '12345678');
});

test('ignores structured dates', () => {
  assert.equal(extractOTP('The appointment date is 2026-08-03'), null);
  assert.equal(extractOTP('تاريخ الموعد 03/08/2026'), null);
  assert.equal(extractOTP('Date: 03.08.26'), null);
});

test('ignores contiguous and grouped phone numbers', () => {
  assert.equal(extractOTP('Phone: 01012345'), null);
  assert.equal(extractOTP('Call +20 10 1234 5678'), null);
  assert.equal(extractOTP('Call +1 (555) 123-4567'), null);
  assert.equal(extractOTP('Call 010-12345678'), null);
  assert.equal(extractOTP('رقم الهاتف: 010 1234 5678'), null);
});

test('chooses an OTP when the message also contains a phone number and date', () => {
  const message = 'Call +20 10 1234 5678 before 03/08/2026. Your code is 739201.';
  assert.equal(extractOTP(message)?.code, '739201');
});

test('rejects years without OTP context', () => {
  assert.equal(extractOTP('Copyright 2026'), null);
});

test('returns null for empty messages and messages without candidates', () => {
  assert.equal(extractOTP(''), null);
  assert.equal(extractOTP('No verification number was included.'), null);
});

test('throws a useful error for non-string input', () => {
  assert.throws(() => extractOTP(123456), /expects a string message/);
});
