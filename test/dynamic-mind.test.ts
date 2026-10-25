import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sovereignMind } = require('../dynamic-mind.cjs');
const { searchBanks, getBankOptions } = require('../src/knowledge/search-engine.cjs');

describe('SARI Sovereign Dynamic Mind & Bank Knowledgebase Integration', () => {
  it('searchBanks returns matched lenders for personal loan', () => {
    const result = searchBanks({ query: 'HDFC', product: 'PERSONAL LOAN' });
    expect(result).toBeTruthy();
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].product).toBe('PERSONAL LOAN');
    expect(result.results[0].startingRate).toMatch(/%/);
    expect(result.results[0].tatDays).toBeGreaterThan(0);
  });

  it('searchBanks recommends 2-bank split for amounts >= 50 Lakhs', () => {
    const result = searchBanks({ amount: 5000000 });
    expect(result.splitRecommendation).toBeTruthy();
    expect(result.splitRecommendation.recommended).toBe(true);
    expect(result.splitRecommendation.structure.length).toBe(2);
  });

  it('getBankOptions returns valid options array for UI components', () => {
    const options = getBankOptions('PERSONAL LOAN');
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].label).toBeTruthy();
    expect(options[0].startingRate).toBeTruthy();
  });

  it('sovereignMind.infer enriches loan queries with BANK_KNOWLEDGEBASE', async () => {
    const result = await sovereignMind.infer('What are starting ROI and lenders for personal loan?');
    expect(result).toBeTruthy();
    expect(result.text).toBeTruthy();
    expect(result.text).toMatch(/UNDERSTAND/);
    expect(result.text).toMatch(/PLAN/);
    expect(result.text).toMatch(/BANK_KNOWLEDGEBASE/);
  }, 60000);
});
