import { searchSearxng } from '@/lib/searxng';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = async (req: Request) => {
  try {
    const body: {
      query?: string;
      limit?: number;
    } = await req.json();

    const query = body.query?.trim();

    if (!query) {
      return Response.json(
        { message: 'Query is required.' },
        { status: 400 },
      );
    }

    const limit = Math.min(Math.max(body.limit ?? 8, 1), 12);

    const { results, suggestions } = await searchSearxng(query, {
      language: 'auto',
      pageno: 1,
    });

    const seen = new Set<string>();

    const cleanedResults = (results ?? [])
      .filter((result) => result.title && result.url)
      .filter((result) => {
        if (seen.has(result.url)) return false;
        seen.add(result.url);
        return true;
      })
      .slice(0, limit)
      .map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content ?? '',
        thumbnail:
          result.thumbnail ??
          result.thumbnail_src ??
          result.img_src ??
          '',
      }));

    return Response.json({
      query,
      results: cleanedResults,
      suggestions: suggestions ?? [],
    });
  } catch (err: any) {
    console.error('Results search failed:', err);
    return Response.json(
      { message: 'Could not fetch results.' },
      { status: 500 },
    );
  }
};
