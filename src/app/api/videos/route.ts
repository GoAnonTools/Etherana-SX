import { searchSearxng } from '@/lib/searxng';

type VideoSearchBody = {
  query?: string;
  limit?: number;
};

type VideoResult = {
  img_src: string;
  url: string;
  title: string;
  iframe_src: string;
};

export const POST = async (req: Request) => {
  try {
    const body: VideoSearchBody = await req.json();
    const query = body.query?.trim();

    if (!query) {
      return Response.json({ message: 'Query is required.' }, { status: 400 });
    }

    const limit = Math.min(Math.max(body.limit ?? 10, 1), 20);

    const searchRes = await searchSearxng(query, {
      engines: ['youtube'],
    });

    const seen = new Set<string>();

    const videos: VideoResult[] = (searchRes.results ?? [])
      .map((result) => ({
        img_src: result.thumbnail || result.thumbnail_src || result.img_src || '',
        url: result.url,
        title: result.title,
        iframe_src: result.iframe_src || '',
      }))
      .filter((video) => video.img_src && video.url && video.title && video.iframe_src)
      .filter((video) => {
        const key = video.url || video.iframe_src;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    return Response.json({ videos }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred while searching videos: ${err}`);
    return Response.json(
      { message: 'An error occurred while searching videos' },
      { status: 500 },
    );
  }
};
