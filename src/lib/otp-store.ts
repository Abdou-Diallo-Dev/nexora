type OTPEntry = { code: string; expires: number; attempts: number };
export const OTP_STORE = new Map<string, OTPEntry>();