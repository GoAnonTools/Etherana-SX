/**
 * Validates a URL before it is passed to the scraper.
 *
 * Blocks:
 *  - Non-http/https schemes (file://, ftp://, data://, etc.)
 *  - Loopback addresses (127.x.x.x, ::1, localhost)
 *  - Private / RFC-1918 ranges (10.x, 172.16-31.x, 192.168.x)
 *  - Link-local ranges (169.254.x.x — cloud metadata endpoints live here)
 *  - IPv6 link-local (fe80::)
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost']);

const PRIVATE_IP_PATTERNS = [
  /^127\./,           // loopback
  /^10\./,            // RFC-1918
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC-1918
  /^192\.168\./,      // RFC-1918
  /^169\.254\./,      // link-local (cloud metadata)
  /^0\./,             // this-network
  /^::1$/,            // IPv6 loopback
  /^fe80:/i,          // IPv6 link-local
  /^\[::1\]$/,        // IPv6 loopback in bracket notation
  /^\[fe80:/i,        // IPv6 link-local in bracket notation
];

export type UrlValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export const validateUrl = (raw: string): UrlValidationResult => {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      reason: `Scheme "${parsed.protocol}" is not allowed. Only http and https are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" is not allowed.` };
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: `URL resolves to a private or reserved address and cannot be scraped.`,
      };
    }
  }

  return { valid: true };
};
