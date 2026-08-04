export interface OTPResult {
  /** The extracted code. Arabic-Indic digits are normalized to 0-9. */
  code: string;
  /** A heuristic score from 0 to 0.99, not a statistical probability. */
  confidence: number;
}

/**
 * Extract the most likely OTP from an Arabic or English message.
 * Returns null when no sufficiently strong candidate is found.
 */
export declare function extractOTP(message: string): OTPResult | null;

export default extractOTP;
