/**
 * Validates a URL before it is passed to the scraper.
 *
 * Blocks:
 *  - Non-http/https schemes (file://, ftp://, data://, etc.)
 *  - Loopback addresses (127.x.x.x, ::1, localhost)
 *  - Private / RFC-1918 ranges (10.x, 172.16–31.x, 192.168.x)
 *  - Link-local ranges (169.254.x.x — cloud metadata endpoints live here)
 *  - IPv6 link-local (fe80::)
 *  - IPv6 unique-local (fc00::/7 — fd00:: and fc00::)
 *  - IPv4-mapped IPv6 (::ffff:x.x.x.x) where the mapped address is private
 *  - Unspecified addresses (0.0.0.0, ::)
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost']);

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,                        // loopback
  /^10\./,                         // RFC-1918
  /^172\.(1[6-9]|2\d|3[01])\./,   // RFC-1918
  /^192\.168\./,                   // RFC-1918
  /^169\.254\./,                   // link-local (cloud metadata)
  /^0\./,                          // this-network / unspecified
];

const PRIVATE_IPV6_PATTERNS = [
  /^\[::1\]$/,       // loopback
  /^\[fe80:/i,       // link-local
  /^\[fc[0-9a-f]{2}:/i, // unique-local fc00::/7 (fc__)
  /^\[fd[0-9a-f]{2}:/i, // unique-local fc00::/7 (fd__)
  /^\[::\]$/,        // unspecified (::)
];

/**
 * Decodes an IPv4-mapped IPv6 hostname (e.g. "[::ffff:7f00:1]") back to its
 * dotted-decimal IPv4 string. Returns null for any other form.
 *
 * Node.js normalises all variants (mixed, hex-with-leading-zeros, etc.) to
 * the short-hex two-group form "::ffff:XXXX:YYYY" before we ever see them,
 * so matching that single canonical form is sufficient.
 */
const decodeIPv4Mapped = (hostname: string): string | null => {
  const inner = hostname.replace(/^\[|\]$/g, '');
  const m = inner.match(/^::ffff:([0-9a-f]+):([0-9a-f]+)$/i);
  if (!m) return null;

  const hi = parseInt(m[1], 16);
  const lo = parseInt(m[2], 16);

  return [
    (hi >> 8) & 0xff,
    hi & 0xff,
    (lo >> 8) & 0xff,
    lo & 0xff,
  ].join('.');
};

const isPrivateIPv4 = (dotted: string): boolean =>
  PRIVATE_IPV4_PATTERNS.some((p) => p.test(dotted));

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

  // Plain hostname block (e.g. "localhost")
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" is not allowed.` };
  }

  // Plain IPv4 block
  if (isPrivateIPv4(hostname)) {
    return {
      valid: false,
      reason: 'URL resolves to a private or reserved address and cannot be scraped.',
    };
  }

  // Plain IPv6 block (loopback, link-local, unique-local, unspecified)
  if (PRIVATE_IPV6_PATTERNS.some((p) => p.test(hostname))) {
    return {
      valid: false,
      reason: 'URL resolves to a private or reserved address and cannot be scraped.',
    };
  }

  // IPv4-mapped IPv6 block (::ffff:x.x.x.x)
  const mappedIPv4 = decodeIPv4Mapped(hostname);
  if (mappedIPv4 !== null && isPrivateIPv4(mappedIPv4)) {
    return {
      valid: false,
      reason: 'URL resolves to a private or reserved address and cannot be scraped.',
    };
  }

  return { valid: true };
};