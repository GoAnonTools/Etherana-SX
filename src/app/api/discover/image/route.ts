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
  } catch {
    return new Response('Invalid image url', { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(imageUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
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
