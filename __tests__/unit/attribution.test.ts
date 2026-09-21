import {
  compactAttribution,
  hasCampaign,
  mergeAttribution,
  parseAttribution,
} from '@/lib/attribution';

function params(query: string) {
  return new URLSearchParams(query);
}

describe('parseAttribution', () => {
  it('maps the utm parameters onto their fields', () => {
    const attribution = parseAttribution(
      params('utm_source=google&utm_medium=cpc&utm_campaign=lebaran&utm_term=sepatu&utm_content=ad1')
    );

    expect(attribution).toEqual({
      source: 'google',
      medium: 'cpc',
      campaign: 'lebaran',
      term: 'sepatu',
      content: 'ad1',
    });
  });

  it('keeps the ad click ids', () => {
    const attribution = parseAttribution(params('gclid=abc123&fbclid=xyz789'));

    expect(attribution.gclid).toBe('abc123');
    expect(attribution.fbclid).toBe('xyz789');
  });

  it('drops empty values instead of storing blanks', () => {
    const attribution = parseAttribution(params('utm_source=&utm_medium=cpc'));

    expect(attribution).toEqual({ medium: 'cpc' });
    expect(attribution).not.toHaveProperty('source');
  });

  it('drops a value longer than the column budget', () => {
    const attribution = parseAttribution(params(`utm_campaign=${'x'.repeat(300)}`));

    expect(attribution).toEqual({});
  });

  it('keeps the referrer when one is known', () => {
    const attribution = parseAttribution(params(''), 'https://www.google.com/');

    expect(attribution.referrer).toBe('https://www.google.com/');
  });

  it('returns nothing for a bare landing', () => {
    expect(parseAttribution(params(''))).toEqual({});
  });
});

describe('hasCampaign', () => {
  it('is true for a utm campaign and for a click id', () => {
    expect(hasCampaign({ campaign: 'lebaran' })).toBe(true);
    expect(hasCampaign({ gclid: 'abc' })).toBe(true);
  });

  it('is false when only context is present', () => {
    expect(hasCampaign({ referrer: 'https://example.com', landingPage: '/' })).toBe(false);
  });
});

describe('mergeAttribution', () => {
  it('takes the incoming campaign when nothing is stored', () => {
    expect(mergeAttribution(null, { source: 'google' })).toEqual({ source: 'google' });
  });

  it('keeps the first touch when an organic visit arrives later', () => {
    const merged = mergeAttribution({ source: 'google', campaign: 'lebaran' }, { referrer: 'x' });

    expect(merged.source).toBe('google');
    expect(merged.campaign).toBe('lebaran');
  });

  it('fills a missing campaign field from the new visit', () => {
    const merged = mergeAttribution({ source: 'google' }, { campaign: 'lebaran' });

    expect(merged).toEqual({ source: 'google', campaign: 'lebaran' });
  });

  it('lets a fresh click id replace the stored one', () => {
    const merged = mergeAttribution({ gclid: 'old-click' }, { gclid: 'new-click' });

    expect(merged.gclid).toBe('new-click');
  });

  it('does not overwrite the stored campaign with a second ad', () => {
    const merged = mergeAttribution({ campaign: 'lebaran' }, { campaign: 'natal' });

    expect(merged.campaign).toBe('lebaran');
  });
});

describe('compactAttribution', () => {
  it('removes undefined and empty entries', () => {
    expect(compactAttribution({ source: 'google', medium: '', campaign: undefined })).toEqual({
      source: 'google',
    });
  });
});
