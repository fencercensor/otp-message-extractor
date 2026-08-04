const MIN_CONFIDENCE = 0.5;

const OTP_KEYWORDS = [
  /verification\s+(?:code|number)/giu,
  /security\s+code/giu,
  /confirmation\s+code/giu,
  /authentication\s+code/giu,
  /one[-\s]?time\s+(?:password|passcode|pin)/giu,
  /passcode/giu,
  /\botp\b/giu,
  /\bpin\b/giu,
  /\bcode\b/giu,
  /(?:رمز|كود)\s+(?:التحقق|التأكيد|الدخول|المصادقة|الأمان)/gu,
  /كلمة\s+المرور\s+لمرة\s+واحدة/gu,
  /(?:الرمز|الكود)/gu,
];

const NEGATIVE_KEYWORDS = [
  /\b(?:phone|mobile|telephone|tel|whatsapp)\b/giu,
  /(?:رقم\s+)?(?:الهاتف|الجوال|الموبايل|التليفون|الواتساب)/gu,
  /\b(?:date|year|dob)\b/giu,
  /(?:تاريخ|سنة|عام)/gu,
];

const DATE_PATTERNS = [
  /(?<!\d)(?:19|20)\d{2}[/.\-](?:0?[1-9]|1[0-2])[/.\-](?:0?[1-9]|[12]\d|3[01])(?!\d)/gu,
  /(?<!\d)(?:0?[1-9]|[12]\d|3[01])[/.\-](?:0?[1-9]|1[0-2])[/.\-](?:\d{2}|(?:19|20)\d{2})(?!\d)/gu,
];

const PHONE_LABEL_PATTERN = /(?:phone|mobile|telephone|tel|whatsapp|(?:رقم\s+)?(?:الهاتف|الجوال|الموبايل|التليفون|الواتساب))\s*(?:(?:number|رقم)\s*)?[:：-]?\s*\+?[\d\s().-]{3,24}\d/giu;
const PHONE_SEQUENCE_PATTERN = /(?<![\p{L}\d])\+?(?:\(\d{1,4}\)|\d{1,8})(?:[ .-](?:\(\d{1,4}\)|\d{1,8})){1,5}(?!\d)/gu;

/**
 * Convert Arabic-Indic and Eastern Arabic-Indic numerals to ASCII numerals.
 * Each replacement has the same UTF-16 length, so match offsets stay stable.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeDigits(value) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/**
 * @param {RegExp[]} patterns
 * @param {string} text
 * @returns {{ start: number, end: number }[]}
 */
function collectRanges(patterns, text) {
  const ranges = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return ranges;
}

/**
 * @param {string} text
 * @param {{ start: number, end: number }[]} dateRanges
 * @returns {{ start: number, end: number }[]}
 */
function collectPhoneRanges(text, dateRanges) {
  const ranges = collectRanges([PHONE_LABEL_PATTERN], text);
  PHONE_SEQUENCE_PATTERN.lastIndex = 0;

  for (const match of text.matchAll(PHONE_SEQUENCE_PATTERN)) {
    const range = { start: match.index, end: match.index + match[0].length };
    const digitCount = (match[0].match(/\d/g) ?? []).length;
    const overlapsDate = dateRanges.some(
      (dateRange) => range.start < dateRange.end && range.end > dateRange.start,
    );

    if (digitCount >= 9 && digitCount <= 15 && !overlapsDate) {
      ranges.push(range);
    }
  }

  return ranges;
}

/**
 * @param {{ start: number, end: number }} candidate
 * @param {{ start: number, end: number }[]} ranges
 */
function overlapsAny(candidate, ranges) {
  return ranges.some(
    (range) => candidate.start < range.end && candidate.end > range.start,
  );
}

/**
 * @param {{ start: number, end: number }} candidate
 * @param {{ start: number, end: number }[]} ranges
 */
function nearestDistance(candidate, ranges) {
  let nearest = Number.POSITIVE_INFINITY;

  for (const range of ranges) {
    if (candidate.start < range.end && candidate.end > range.start) {
      return 0;
    }

    const distance = candidate.end <= range.start
      ? range.start - candidate.end
      : candidate.start - range.end;
    nearest = Math.min(nearest, distance);
  }

  return nearest;
}

/**
 * @typedef {object} Candidate
 * @property {string} code
 * @property {number} start
 * @property {number} end
 * @property {'numeric' | 'mixed'} kind
 * @property {number} digitCount
 */

/**
 * @param {string} text
 * @param {{ start: number, end: number }[]} protectedRanges
 * @returns {Candidate[]}
 */
function collectCandidates(text, protectedRanges) {
  /** @type {Candidate[]} */
  const candidates = [];
  const seen = new Set();
  const numericPattern = /(?<![\p{L}\d])\d{4,8}(?![\p{L}\d])/gu;
  const mixedPattern = /(?<![\p{L}\d])[\p{L}\d](?:[\p{L}\d]|-(?=[\p{L}\d])){3,11}(?![\p{L}\d-])/gu;

  for (const match of text.matchAll(numericPattern)) {
    const candidate = {
      code: match[0],
      start: match.index,
      end: match.index + match[0].length,
      kind: 'numeric',
      digitCount: match[0].length,
    };

    if (!overlapsAny(candidate, protectedRanges)) {
      candidates.push(candidate);
      seen.add(`${candidate.start}:${candidate.end}`);
    }
  }

  for (const match of text.matchAll(mixedPattern)) {
    const digits = match[0].match(/\d/g) ?? [];
    const letters = match[0].match(/\p{L}/gu) ?? [];
    const alphanumericLength = digits.length + letters.length;
    const candidate = {
      code: match[0],
      start: match.index,
      end: match.index + match[0].length,
      kind: 'mixed',
      digitCount: digits.length,
    };

    if (
      digits.length >= 2
      && digits.length <= 8
      && letters.length >= 1
      && alphanumericLength >= 4
      && alphanumericLength <= 10
      && !seen.has(`${candidate.start}:${candidate.end}`)
      && !overlapsAny(candidate, protectedRanges)
    ) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * @param {Candidate} candidate
 * @param {string} text
 * @param {{ start: number, end: number }[]} keywordRanges
 * @param {{ start: number, end: number }[]} negativeRanges
 */
function scoreCandidate(candidate, text, keywordRanges, negativeRanges) {
  let score = candidate.kind === 'numeric' ? 0.42 : 0.38;

  if (candidate.digitCount === 6) score += 0.08;
  else if (candidate.digitCount === 5 || candidate.digitCount === 7) score += 0.05;
  else score += 0.03;

  if (candidate.kind === 'numeric') score += 0.02;
  if (candidate.kind === 'mixed') score += 0.06;
  if (candidate.code.includes('-')) score += 0.03;

  const keywordDistance = nearestDistance(candidate, keywordRanges);
  if (keywordDistance <= 20) score += 0.38;
  else if (keywordDistance <= 50) score += 0.28;
  else if (keywordDistance <= 100) score += 0.16;
  else if (Number.isFinite(keywordDistance)) score += 0.05;

  const negativeDistance = nearestDistance(candidate, negativeRanges);
  if (negativeDistance <= 18) score -= 0.38;
  else if (negativeDistance <= 50) score -= 0.2;

  const prefix = text.slice(Math.max(0, candidate.start - 18), candidate.start);
  if (/(?:\bis\b|\bis:|هو|هي|[:=])\s*$/iu.test(prefix)) score += 0.05;
  if (text.slice(candidate.end).trim().length === 0) score += 0.03;

  if (
    candidate.kind === 'numeric'
    && candidate.code.length === 4
    && /^(?:19|20)\d{2}$/.test(candidate.code)
    && keywordDistance > 12
  ) {
    score -= 0.18;
  }

  return Math.max(0, Math.min(0.99, Math.round(score * 100) / 100));
}

/**
 * Extract the most likely one-time password from an Arabic or English message.
 * Arabic-Indic digits are normalized to ASCII in the returned code.
 *
 * @param {string} message
 * @returns {{ code: string, confidence: number } | null}
 */
export function extractOTP(message) {
  if (typeof message !== 'string') {
    throw new TypeError('extractOTP expects a string message');
  }

  if (message.trim().length === 0) return null;

  const text = normalizeDigits(message);
  const dateRanges = collectRanges(DATE_PATTERNS, text);
  const phoneRanges = collectPhoneRanges(text, dateRanges);
  const protectedRanges = [...dateRanges, ...phoneRanges];
  const keywordRanges = collectRanges(OTP_KEYWORDS, text);
  const negativeRanges = collectRanges(NEGATIVE_KEYWORDS, text);
  const candidates = collectCandidates(text, protectedRanges);

  let best = null;

  for (const candidate of candidates) {
    const confidence = scoreCandidate(candidate, text, keywordRanges, negativeRanges);
    if (!best || confidence > best.confidence) {
      best = { code: candidate.code, confidence };
    }
  }

  return best && best.confidence >= MIN_CONFIDENCE ? best : null;
}

export default extractOTP;
