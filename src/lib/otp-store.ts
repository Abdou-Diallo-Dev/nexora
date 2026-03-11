// Stockage OTP en mémoire (TTL 10 min)
// En production utiliser une table Supabase otp_codes
type OTPEntry = { code: string; expires: number; attempts: number };
export const OTP_STORE = new Map<string, OTPEntry>();