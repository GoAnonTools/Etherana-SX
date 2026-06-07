import { describe, expect, it } from 'vitest';
import { getTranslation } from '../dictionaries';

describe('getTranslation', () => {
  it('returns English translations', () => {
    expect(getTranslation('en', 'sidebar.search')).toBe('Search');
  });

  it('returns French translations', () => {
    expect(getTranslation('fr', 'sidebar.search')).toBe('Recherche');
  });

  it('falls back safely when needed', () => {
    expect(getTranslation('fr', 'sidebar.discover')).toBeTruthy();
  });
});
