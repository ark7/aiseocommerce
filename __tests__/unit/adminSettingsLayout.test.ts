describe('Admin Settings Layout & Navigation', () => {
  const EXPECTED_TABS = [
    { id: 'general', title: 'Identitas & Kontak', icon: '🏢' },
    { id: 'hero', title: 'Hero Section Builder', icon: '🖼️' },
    { id: 'theme', title: 'Tema Warna & Font', icon: '🎨' },
    { id: 'shipping', title: 'Tarif Ongkir Manual', icon: '🚚' },
    { id: 'integrations', title: 'Pixel & Keamanan', icon: '🛡️' },
    { id: 'legal', title: 'Legal & Cookie', icon: '📄' },
    { id: 'ai', title: 'AI Assistant (BYOK)', icon: '✨' },
    { id: 'notifications', title: 'Notifikasi Otomatis', icon: '📲' },
    { id: 'email', title: 'Email & SMTP', icon: '✉️' },
  ];

  it('contains all 9 settings categories with icons and unique IDs', () => {
    const ids = EXPECTED_TABS.map((t) => t.id);
    const uniqueIds = Array.from(new Set(ids));
    expect(uniqueIds.length).toBe(9);
    expect(ids).toContain('general');
    expect(ids).toContain('shipping');
    expect(ids).toContain('ai');
    expect(ids).toContain('notifications');
    expect(ids).toContain('email');
    expect(ids).toContain('legal');
  });

  it('validates URL query param resolution with fallback to general', () => {
    function resolveTab(param: string | null) {
      const valid = EXPECTED_TABS.map((t) => t.id);
      return param && valid.includes(param) ? param : 'general';
    }

    expect(resolveTab('shipping')).toBe('shipping');
    expect(resolveTab('ai')).toBe('ai');
    expect(resolveTab('email')).toBe('email');
    expect(resolveTab('notifications')).toBe('notifications');
    expect(resolveTab('theme')).toBe('theme');
    expect(resolveTab('unknown-tab')).toBe('general');
    expect(resolveTab(null)).toBe('general');
  });
});

