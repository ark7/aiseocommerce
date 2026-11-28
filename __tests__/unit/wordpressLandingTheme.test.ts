import fs from 'fs';
import path from 'path';

describe('WordPress Landing Page Theme (wordpress/themes/larisdari-web-landing)', () => {
  const repoRoot = process.cwd();
  const themeDir = path.join(repoRoot, 'wordpress', 'themes', 'larisdari-web-landing');

  it('contains all required WordPress theme files, blog templates, brand assets, CMS module, seeder, and deploy script', () => {
    const requiredFiles = [
      'style.css',
      'functions.php',
      'header.php',
      'front-page.php',
      'index.php',
      'footer.php',
      'single.php',
      'page-artikel.php',
      'archive.php',
      path.join('inc', 'cms-admin.php'),
      path.join('assets', 'js', 'landing.js'),
      path.join('assets', 'images', 'logo.svg'),
      path.join('assets', 'images', 'logo-dark.svg'),
      path.join('assets', 'images', 'favicon.svg'),
      path.join('assets', 'images', 'favicon-180.png'),
      path.join('assets', 'images', 'og-larisdari-web.png'),
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(themeDir, file))).toBe(true);
    }

    expect(fs.existsSync(path.join(repoRoot, 'wordpress', 'content', 'seo-articles.json'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, 'scripts', 'seed-wp-seo-articles.php'))).toBe(true);

    const deployScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'deploy-wp-landing.sh'), 'utf8');
    expect(deployScript).toContain('https://larisdari.web.id');
    expect(deployScript).toContain('https://demo.larisdari.web.id');
    expect(deployScript).toContain('larisdari-web-landing');
    expect(deployScript).toContain('seed-wp-seo-articles.php');
  });

  it('defines valid WordPress theme metadata, focus-visible accessibility, tap targets, and blog styles in style.css', () => {
    const styleCss = fs.readFileSync(path.join(themeDir, 'style.css'), 'utf8');
    expect(styleCss).toContain('Theme Name: LarisDari.web.id Official Landing');
    expect(styleCss).toContain('Text Domain: larisdari-web-landing');
    expect(styleCss).toContain('.lm-header');
    expect(styleCss).toContain('.lm-mobile-drawer');
    expect(styleCss).toContain('.lm-order-form-card');
    expect(styleCss).toContain('.lm-compare-heading');
    expect(styleCss).toContain('.lm-check-body');
    expect(styleCss).toContain('.lm-check-title');
    expect(styleCss).toContain('.lm-check-desc');
    expect(styleCss).toContain('@media (min-width: 960px)');
    expect(styleCss).toContain('.lm-skip-link');
    expect(styleCss).toContain(':focus-visible');
    expect(styleCss).toContain('prefers-reduced-motion');
    expect(styleCss).toContain('width: 48px;');
    expect(styleCss).toContain('.lm-article-grid');
    expect(styleCss).toContain('.lm-article-body');
    expect(styleCss).toContain('.lm-breadcrumb');
  });

  it('registers WP Customizer, rich SEO metadata (SoftwareApplication, BlogPosting, BreadcrumbList), sitemap headers, WP security, and Analytics', () => {
    const functionsPhp = fs.readFileSync(path.join(themeDir, 'functions.php'), 'utf8');
    const cmsAdminPhp = fs.readFileSync(path.join(themeDir, 'inc', 'cms-admin.php'), 'utf8');

    expect(functionsPhp).toContain("require_once get_template_directory() . '/inc/cms-admin.php'");
    expect(functionsPhp).toContain('customize_register');
    expect(functionsPhp).toContain('larisdari_web_demo_url');
    expect(functionsPhp).toContain('application/ld+json');
    expect(functionsPhp).toContain('SoftwareApplication');
    expect(functionsPhp).toContain('FAQPage');
    expect(functionsPhp).toContain('BlogPosting');
    expect(functionsPhp).toContain('BreadcrumbList');
    expect(functionsPhp).toContain('larisdari_web_is_sitemap_request');
    expect(functionsPhp).toContain('rel="canonical"');
    expect(functionsPhp).toContain('property="og:image"');
    expect(functionsPhp).toContain('wp_sitemaps_add_provider');
    expect(functionsPhp).toContain('rest_endpoints');
    expect(functionsPhp).toContain('rsd_link');
    expect(functionsPhp).toContain('wp-block-library');
    expect(functionsPhp).toContain("'strategy' => 'defer'");

    // Public functions must NOT expose hardcoded WhatsApp numbers
    expect(functionsPhp).not.toContain('6281288997711');
    expect(functionsPhp).not.toContain('wa.me/');

    // CMS Admin Leads + Click-to-Chat WA + Next.js Webhook Sync
    expect(cmsAdminPhp).toContain('larisdari_web_submit_lead');
    expect(cmsAdminPhp).toContain('larisdari-web-leads');
    expect(cmsAdminPhp).toContain('Klik to Chat WA');
    expect(cmsAdminPhp).toContain('https://wa.me/');
    expect(cmsAdminPhp).toContain('larisdari_web_export_leads_csv');
    expect(cmsAdminPhp).toContain('larisdari_web_webhook_options');
    expect(cmsAdminPhp).toContain('x-license-webhook-secret');

    // Indonesian Pixel & Analytics support (GTM, Google Ads, GA4, Meta Pixel, TikTok Pixel)
    expect(cmsAdminPhp).toContain('larisdari-web-analytics');
    expect(cmsAdminPhp).toContain('googletagmanager.com/gtm.js');
    expect(cmsAdminPhp).toContain('gtag/js');
    expect(cmsAdminPhp).toContain('gads_conversion_label');
    expect(cmsAdminPhp).toContain('fbevents.js');
    expect(cmsAdminPhp).toContain('analytics.tiktok.com');
  });

  it('routes public CTAs to #pesan without wa.me/admin exposure and satisfies heading order & form a11y', () => {
    const headerPhp = fs.readFileSync(path.join(themeDir, 'header.php'), 'utf8');
    const frontPagePhp = fs.readFileSync(path.join(themeDir, 'front-page.php'), 'utf8');
    const footerPhp = fs.readFileSync(path.join(themeDir, 'footer.php'), 'utf8');
    const indexPhp = fs.readFileSync(path.join(themeDir, 'index.php'), 'utf8');
    const singlePhp = fs.readFileSync(path.join(themeDir, 'single.php'), 'utf8');

    expect(headerPhp).toContain('#pesan');
    expect(headerPhp).toContain('/artikel/');
    expect(headerPhp).toContain('lm-skip-link');
    expect(headerPhp).toContain('assets/images/logo.svg');
    expect(footerPhp).toContain('#pesan');
    expect(footerPhp).toContain('/artikel/');
    expect(footerPhp).toContain('assets/images/logo-dark.svg');
    expect(footerPhp).not.toContain('<h4');
    expect(footerPhp).toContain('lm-footer-heading');
    expect(singlePhp).toContain('lm-article-cta-box');

    for (const content of [headerPhp, frontPagePhp, footerPhp, indexPhp, singlePhp]) {
      expect(content).not.toContain('wa.me');
      expect(content).not.toMatch(/0812|628[0-9]{4,}/);
      expect(content).not.toMatch(/konsultasi|konsul/i);
      expect(content).not.toContain('Login CMS Admin');
      expect(content).not.toContain('larisdari-web-leads');
      expect(content).not.toContain('wp-admin/admin.php');
    }

    const functionsPhp = fs.readFileSync(path.join(themeDir, 'functions.php'), 'utf8');
    expect(functionsPhp).toContain('nocache_headers');
    expect(functionsPhp).not.toMatch(/0812|628[0-9]{4,}/);
    expect(functionsPhp).not.toMatch(/konsultasi|konsul/i);

    expect(frontPagePhp).toContain('Website komersial pemersatu jalur penjualan online Anda');
    expect(frontPagePhp).toContain('https://demo.larisdari.web.id');
    expect(frontPagePhp).toContain('Lisensi 1 Website');
    expect(frontPagePhp).toContain('Rp 150.000');
    expect(frontPagePhp).toContain('Rp 350.000');
    expect(frontPagePhp).toContain('Rp 200.000');
    expect(frontPagePhp).toContain('Rp 450.000');
    expect(frontPagePhp).toContain('Rp 3.000.000');
    expect(frontPagePhp).toContain('DEFERRED_6M');
    expect(frontPagePhp).toContain('OWNED');
    expect(frontPagePhp).toContain('DEDICATED');
    expect(frontPagePhp).toContain('SHARED');
    expect(frontPagePhp).toContain('Gratis Support Setting');
    expect(frontPagePhp).toContain('selama LarisDari.web.id beroperasi');
    expect(frontPagePhp).toContain('Custom Domain');
    expect(frontPagePhp).not.toContain('Starter UMKM');

    expect(frontPagePhp).toContain('id="pesan"');
    expect(frontPagePhp).toContain('id="panduan"');
    expect(frontPagePhp).toContain('larisdari_web_submit_lead');
    expect(frontPagePhp).toContain('name="whatsapp"');
    expect(frontPagePhp).toContain('name="brand_name"');
    expect(frontPagePhp).toContain('autocomplete="name"');
    expect(frontPagePhp).toContain('autocomplete="tel"');
    expect(frontPagePhp).toContain('autocomplete="email"');
    expect(frontPagePhp).toContain('#047857');
    expect(frontPagePhp).not.toContain('*first impression*');
    expect(frontPagePhp).toContain('lm-compare-heading');
    expect(frontPagePhp).toContain('lm-check-body');
    expect(frontPagePhp).toContain('lm-check-title');
    expect(frontPagePhp).toContain('lm-check-desc');
    expect(indexPhp).toContain('front-page.php');
  });

  it('provides 10 complete evergreen StoryBrand SEO articles with realistic 1200x675 illustrations and internal links', () => {
    const articlesPath = path.join(repoRoot, 'wordpress', 'content', 'seo-articles.json');
    const rawJson = fs.readFileSync(articlesPath, 'utf8');
    expect(rawJson).not.toMatch(/laris\s*manis/i);

    const articles = JSON.parse(rawJson) as Array<{
      slug: string;
      title: string;
      seoTitle: string;
      seoDescription: string;
      category: string;
      imageFile: string;
      imageAlt: string;
      contentHtml: string;
    }>;

    expect(articles).toHaveLength(10);
    const seenSlugs = new Set<string>();

    for (const article of articles) {
      expect(article.slug.length).toBeGreaterThan(10);
      expect(seenSlugs.has(article.slug)).toBe(false);
      seenSlugs.add(article.slug);

      expect(article.seoDescription.length).toBeGreaterThanOrEqual(110);
      expect(article.seoDescription.length).toBeLessThanOrEqual(165);

      // Evergreen rule (Opsi A): no hardcoded price numbers in article bodies
      expect(article.contentHtml).not.toMatch(/Rp\s*3\.000\.000|Rp\s*150\.000/i);
      expect(article.contentHtml).not.toMatch(/wa\.me|0812|628[0-9]{4,}/i);
      expect(article.contentHtml).not.toMatch(/konsultasi|konsul/i);

      // Word count >= 600 words & internal links present
      const plainWords = article.contentHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/);
      expect(plainWords.length).toBeGreaterThanOrEqual(600);
      expect(article.contentHtml).toContain('https://larisdari.web.id/');

      // Realistic illustration file exists and is non-trivial (> 10 KB)
      const imgPath = path.join(themeDir, 'assets', 'images', 'articles', article.imageFile);
      expect(fs.existsSync(imgPath)).toBe(true);
      expect(fs.statSync(imgPath).size).toBeGreaterThan(10_000);
      expect(article.imageAlt.length).toBeGreaterThan(15);
    }
  });

  it('contains zero legacy larismanis identifiers across theme files and deploy script', () => {
    const themeFiles = [
      'style.css',
      'functions.php',
      'header.php',
      'front-page.php',
      'footer.php',
      'index.php',
      'single.php',
      'page-artikel.php',
      'archive.php',
      path.join('inc', 'cms-admin.php'),
      path.join('assets', 'js', 'landing.js'),
      path.join('assets', 'images', 'logo.svg'),
      path.join('assets', 'images', 'logo-dark.svg'),
      path.join('assets', 'images', 'favicon.svg'),
    ];

    for (const file of themeFiles) {
      const content = fs.readFileSync(path.join(themeDir, file), 'utf8');
      expect(content).not.toMatch(/laris\s*manis/i);
    }

    const deployScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'deploy-wp-landing.sh'), 'utf8');
    expect(deployScript).not.toMatch(/laris\s*manis/i);
  });
});
