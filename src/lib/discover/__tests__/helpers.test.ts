import { describe, expect, it } from 'vitest';
import {
  type DiscoverApiItem,
  getDiscoverItemScore,
  getSearchLanguage,
  getSourceScore,
  getTopicConfig,
  isBadDiscoverResult,
  keepRelevantItems,
  mergeUniqueItems,
  sortBestFirst,
} from '../helpers';

const makeItem = (
  overrides: Partial<DiscoverApiItem> = {},
): DiscoverApiItem => ({
  title: 'Artificial intelligence startup launches new cybersecurity software',
  content:
    'A technology company announced a new artificial intelligence product for cybersecurity teams and software developers.',
  url: 'https://techcrunch.com/2026/06/07/example-ai-startup-story',
  thumbnail:
    '/api/discover/image?url=https%3A%2F%2Fexample.com%2Fimage.jpg',
  ...overrides,
});

describe('Discover helpers', () => {
  it('maps auto language to English search', () => {
    expect(getSearchLanguage('auto')).toBe('en');
    expect(getSearchLanguage('en')).toBe('en');
    expect(getSearchLanguage('fr')).toBe('fr');
  });

  it('uses English topic sources by default', () => {
    expect(getTopicConfig('tech', 'en').links).toContain('techcrunch.com');
  });

  it('uses French topic sources for French mode', () => {
    expect(getTopicConfig('tech', 'fr').links).toContain('numerama.com');
    expect(getTopicConfig('sports', 'fr').links).toContain('lequipe.fr');
  });

  it('scores known English sources higher', () => {
    expect(getSourceScore(makeItem(), 'tech', 'en')).toBe(8);
  });

  it('scores known French sources higher in French mode', () => {
    const item = makeItem({
      title: 'L’intelligence artificielle transforme la cybersécurité',
      content:
        'Une startup française présente un logiciel de cybersécurité fondé sur l’intelligence artificielle.',
      url: 'https://www.numerama.com/tech/example-ia-cybersecurite.html',
    });

    expect(getSourceScore(item, 'tech', 'fr')).toBe(8);
  });

  it('rejects utility/archive style results', () => {
    expect(
      isBadDiscoverResult(
        makeItem({
          title: 'Latest news, photos and videos',
          url: 'https://example.com/latest',
        }),
        'tech',
      ),
    ).toBe(true);
  });

  it('rejects sports scoreboard style results', () => {
    expect(
      isBadDiscoverResult(
        makeItem({
          title: 'Premier League live scores and scoreboard',
          url: 'https://example.com/scores',
        }),
        'sports',
      ),
    ).toBe(true);
  });

  it('keeps relevant items when enough pass the threshold', () => {
    const relevantItems = Array.from({ length: 8 }, (_, index) =>
      makeItem({
        url: `https://techcrunch.com/2026/06/07/example-${index}`,
      }),
    );

    const weakItem = makeItem({
      title: 'Home page',
      content: 'Home',
      url: 'https://example.com/',
      thumbnail: '',
    });

    expect(
      keepRelevantItems([...relevantItems, weakItem], 'tech', 'en'),
    ).toHaveLength(8);
  });

  it('falls back to original items when too few pass relevance filtering', () => {
    const items = Array.from({ length: 4 }, (_, index) =>
      makeItem({
        title: `Home page ${index}`,
        content: 'Home',
        url: `https://example.com/${index}`,
        thumbnail: '',
      }),
    );

    expect(keepRelevantItems(items, 'tech', 'en')).toHaveLength(4);
  });

  it('deduplicates by URL and long normalized title', () => {
    const items = [
      makeItem({
        title: 'Artificial Intelligence Startup Launches New Tool - Source A',
        url: 'https://techcrunch.com/story-a',
      }),
      makeItem({
        title: 'Artificial Intelligence Startup Launches New Tool | Source B',
        url: 'https://wired.com/story-b',
      }),
      makeItem({
        title: 'Different cybersecurity story',
        url: 'https://wired.com/story-c',
      }),
    ];

    expect(mergeUniqueItems(items)).toHaveLength(2);
  });

  it('sorts stronger items first', () => {
    const weak = makeItem({
      title: 'Generic short story',
      content: 'Brief content',
      url: 'https://example.com/story',
      thumbnail: '',
    });

    const strong = makeItem();

    expect(sortBestFirst([weak, strong], 'tech', 'en')[0]).toBe(strong);
    expect(getDiscoverItemScore(strong, 'tech', 'en')).toBeGreaterThan(
      getDiscoverItemScore(weak, 'tech', 'en'),
    );
  });
});
