import { searchSearxng } from '@/lib/searxng';

type ImageSearchBody = {
  query?: string;
  limit?: number;
};

type ImageResult = {
  img_src: string;
  url: string;
  title: string;
};

export const POST = async (req: Request) => {
  try {
    const body: ImageSearchBody = await req.json();
    const query = body.query?.trim();

    if (!query) {
      return Response.json({ message: 'Query is required.' }, { status: 400 });
    }

    const limit = Math.min(Math.max(body.limit ?? 10, 1), 20);

    const searchRes = await searchSearxng(query, {
      engines: ['bing images', 'google images'],
    });

    const seen = new Set<string>();

    const images: ImageResult[] = (searchRes.results ?? [])
      .map((result) => ({
        img_src: result.img_src || result.thumbnail_src || result.thumbnail || '',
        url: result.url,
        title: result.title,
      }))
      .filter((image) => image.img_src && image.url && image.title)
      .filter((image) => {
        const key = image.img_src || image.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);

    return Response.json({ images }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred while searching images: ${err}`);
    return Response.json(
      { message: 'An error occurred while searching images' },
      { status: 500 },
    );
  }
};
