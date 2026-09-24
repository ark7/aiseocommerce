import { buildAnalyticsTags, parseAnalyticsConfig } from '@/lib/analytics';

describe('parseAnalyticsConfig', () => {
  it('returns an empty config for junk input instead of throwing', () => {
    expect(parseAnalyticsConfig(null)).toEqual({});
    expect(parseAnalyticsConfig('nope')).toEqual({});
    expect(parseAnalyticsConfig({ googleTagId: 'not-a-tag' })).toEqual({});
  });

  it('keeps valid ids', () => {
    expect(
      parseAnalyticsConfig({ googleTagId: 'GTM-ABCDE12', tiktokPixelId: 'C1A2B3D4E5F6G7H8' })
    ).toEqual({ googleTagId: 'GTM-ABCDE12', tiktokPixelId: 'C1A2B3D4E5F6G7H8' });
  });

  it('drops unknown keys rather than passing them through', () => {
    expect(parseAnalyticsConfig({ googleTagId: 'G-ABCDE12345', evil: 'x' })).toEqual({});
  });
});

describe('buildAnalyticsTags', () => {
  it('emits nothing when no ids are configured', () => {
    expect(buildAnalyticsTags({})).toEqual([]);
  });

  it('emits a Google Tag snippet for a GA4 id', () => {
    const [tag] = buildAnalyticsTags({ googleTagId: 'G-ABCDE12345' });
    expect(tag.id).toBe('google-tag-G-ABCDE12345');
    expect(tag.script).toContain('gtag(\'config\',"G-ABCDE12345")');
  });

  it('emits TikTok and Meta pixel loaders for their ids', () => {
    const tags = buildAnalyticsTags({
      tiktokPixelId: 'C1A2B3D4E5F6G7H8',
      facebookPixelId: '123456789',
    });
    expect(tags.map((tag) => tag.id)).toEqual([
      'tiktok-pixel-C1A2B3D4E5F6G7H8',
      'facebook-pixel-123456789',
    ]);
    expect(tags[0].script).toContain('analytics.tiktok.com');
    expect(tags[1].script).toContain('connect.facebook.net');
  });

  it('quotes ids so a crafted value cannot break out of the script', () => {
    const [tag] = buildAnalyticsTags({ instagramAccountId: 'toko.saya' });
    expect(tag.script).toContain('{"instagram":"toko.saya","youtube":null}');
  });
});
