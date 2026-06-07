import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const runtime = 'nodejs';

const isPrivateIpv4 = (address: string) => {
  const parts = address.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

const isPrivateIpv6 = (address: string) => {
  const normalized = address.toLowerCase();

  if (
    normalized === '::1' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  ) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.replace('::ffff:', '');
    return isPrivateIpv4(mappedIpv4);
  }

  return false;
};

const isBlockedAddress = (address: string) => {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return false;
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === 'local' ||
    normalized.endsWith('.local')
  );
};

const assertPublicImageTarget = async (imageUrl: URL) => {
  const hostname = imageUrl.hostname;

  if (isBlockedHostname(hostname) || isBlockedAddress(hostname)) {
    throw new Error('Blocked private image host');
  }

  const resolvedAddresses = await lookup(hostname, {
    all: true,
    verbatim: true,
  });

  if (
    resolvedAddresses.length === 0 ||
    resolvedAddresses.some((entry) => isBlockedAddress(entry.address))
  ) {
    throw new Error('Blocked private image address');
  }
};

export const GET = async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const rawUrl = params.get('url');

  if (!rawUrl) {
    return new Response('Missing image url', { status: 400 });
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(rawUrl);

    if (imageUrl.protocol !== 'http:' && imageUrl.protocol !== 'https:') {
      return new Response('Invalid image protocol', { status: 400 });
    }

    await assertPublicImageTarget(imageUrl);
  } catch {
    return new Response('Invalid or blocked image url', { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(imageUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return new Response('Image fetch failed', { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';

    if (
      !contentType.startsWith('image/') &&
      contentType !== 'application/octet-stream'
    ) {
      return new Response('Response is not an image', { status: 415 });
    }

    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Image fetch error', { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
};
