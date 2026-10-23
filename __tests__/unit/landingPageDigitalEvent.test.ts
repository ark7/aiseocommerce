import {
  createDefaultSection,
  createPhysicalLandingPageTemplate,
  createEventLandingPageTemplate,
  createDigitalProductLandingPageTemplate,
  EventDetailsSectionData,
  SpeakersSectionData,
  EventScheduleSectionData,
  DigitalCurriculumSectionData,
  PricingTiersSectionData,
} from '@/lib/landingPageTypes';

describe('Landing Page Digital & Event CMS Templates and Sections', () => {
  describe('createDefaultSection for new Event & Digital sections', () => {
    it('generates event_details section with comprehensive defaults', () => {
      const section = createDefaultSection('event_details') as EventDetailsSectionData;
      expect(section.type).toBe('event_details');
      expect(section.title).toBeDefined();
      expect(section.locationType).toBe('ONLINE');
      expect(section.platformBadge).toContain('100');
      expect(section.quotaRemaining).toBe(23);
      expect(Array.isArray(section.benefits)).toBe(true);
      expect(section.benefits.length).toBeGreaterThanOrEqual(3);
    });

    it('generates speakers section with default speaker roster', () => {
      const section = createDefaultSection('speakers') as SpeakersSectionData;
      expect(section.type).toBe('speakers');
      expect(Array.isArray(section.speakers)).toBe(true);
      expect(section.speakers.length).toBeGreaterThan(0);
      expect(section.speakers[0]).toHaveProperty('name');
      expect(section.speakers[0]).toHaveProperty('role');
      expect(section.speakers[0]).toHaveProperty('avatar');
    });

    it('generates event_schedule section with sessions rundown', () => {
      const section = createDefaultSection('event_schedule') as EventScheduleSectionData;
      expect(section.type).toBe('event_schedule');
      expect(Array.isArray(section.sessions)).toBe(true);
      expect(section.sessions.length).toBeGreaterThan(0);
      expect(section.sessions[0]).toHaveProperty('time');
      expect(section.sessions[0]).toHaveProperty('title');
      expect(section.sessions[0]).toHaveProperty('description');
    });

    it('generates digital_curriculum section with syllabus and modules', () => {
      const section = createDefaultSection('digital_curriculum') as DigitalCurriculumSectionData;
      expect(section.type).toBe('digital_curriculum');
      expect(section.totalModulesText).toBeDefined();
      expect(Array.isArray(section.modules)).toBe(true);
      expect(section.modules.length).toBeGreaterThan(0);
      expect(section.modules[0]).toHaveProperty('durationOrPages');
      expect(section.modules[0]).toHaveProperty('isFreePreview');
      expect(section.modules[0]).toHaveProperty('topics');
    });

    it('generates pricing_tiers section with multi-tier ticket cards', () => {
      const section = createDefaultSection('pricing_tiers') as PricingTiersSectionData;
      expect(section.type).toBe('pricing_tiers');
      expect(Array.isArray(section.tiers)).toBe(true);
      expect(section.tiers.length).toBeGreaterThanOrEqual(2);
      expect(section.tiers[0]).toHaveProperty('name');
      expect(section.tiers[0]).toHaveProperty('price');
      expect(section.tiers[0].features.length).toBeGreaterThan(0);
    });
  });

  describe('1-Click Landing Page Template Presets', () => {
    it('creates Physical Product template with expected sections', () => {
      const template = createPhysicalLandingPageTemplate();
      expect(template.length).toBe(7);
      const types = template.map((s) => s.type);
      expect(types).toEqual([
        'hero',
        'proof_trust',
        'features',
        'offer',
        'testimonials',
        'faq',
        'sticky_cta',
      ]);
    });

    it('creates Event / Seminar template with event-specific sections', () => {
      const template = createEventLandingPageTemplate();
      const types = template.map((s) => s.type);
      expect(types).toContain('hero');
      expect(types).toContain('event_details');
      expect(types).toContain('speakers');
      expect(types).toContain('event_schedule');
      expect(types).toContain('pricing_tiers');
      expect(types).toContain('testimonials');
      expect(types).toContain('faq');
      expect(types).toContain('sticky_cta');

      const hero = template.find((s) => s.type === 'hero');
      expect(hero).toBeDefined();
      expect((hero as any).badge).toContain('SEMINAR');
    });

    it('creates Digital Product template with curriculum and instant access flow', () => {
      const template = createDigitalProductLandingPageTemplate();
      const types = template.map((s) => s.type);
      expect(types).toContain('hero');
      expect(types).toContain('proof_trust');
      expect(types).toContain('features');
      expect(types).toContain('digital_curriculum');
      expect(types).toContain('pricing_tiers');
      expect(types).toContain('testimonials');
      expect(types).toContain('faq');
      expect(types).toContain('sticky_cta');

      const hero = template.find((s) => s.type === 'hero');
      expect(hero).toBeDefined();
      expect((hero as any).badge).toContain('PRODUK DIGITAL');
    });
  });
});

