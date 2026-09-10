import { createHash, randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token.
 * Used for QR tokens, verification tokens, etc.
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * SHA-256 hash of a string.
 * Used for privacy-conscious IP logging (we store the hash, not the raw IP).
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Hash an IP address for privacy-conscious storage.
 * Truncates to first 3 octets for IPv4 before hashing to prevent
 * trivial reversibility while retaining abuse-detection utility.
 */
export function hashIp(ip: string): string {
  // For IPv4: keep first 3 octets (e.g., 192.168.1.x → 192.168.1)
  const truncated = ip.includes(".")
    ? ip.split(".").slice(0, 3).join(".")
    : ip; // IPv6: hash as-is
  return sha256(truncated);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
