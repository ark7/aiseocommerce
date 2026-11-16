import fs from 'fs';
import path from 'path';

describe('WordPress Landing Page Theme (wordpress/themes/larismanis-landing)', () => {
  const repoRoot = process.cwd();
  const themeDir = path.join(repoRoot, 'wordpress', 'themes', 'larismanis-landing');

  it('contains all required WordPress theme files and deployment script', () => {
    const requiredFiles = [
      'style.css',
      'functions.php',
      'header.php',
      'front-page.php',
      'index.php',
      'footer.php',
      path.join('assets', 'js', 'landing.js'),
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(themeDir, file))).toBe(true);
    }

    expect(fs.existsSync(path.join(repoRoot, 'scripts', 'deploy-wp-landing.sh'))).toBe(true);
  });

  it('defines valid WordPress theme metadata and responsive layout styles in style.css', () => {
    const styleCss = fs.readFileSync(path.join(themeDir, 'style.css'), 'utf8');
    expect(styleCss).toContain('Theme Name: LarisManis.online Official Landing');
    expect(styleCss).toContain('Text Domain: larismanis-landing');
    expect(styleCss).toContain('.lm-header');
    expect(styleCss).toContain('.lm-mobile-drawer');
    expect(styleCss).toContain('@media (min-width: 960px)');
  });

  it('registers WP Customizer settings and SoftwareApplication SEO JSON-LD in functions.php', () => {
    const functionsPhp = fs.readFileSync(path.join(themeDir, 'functions.php'), 'utf8');
    expect(functionsPhp).toContain('customize_register');
    expect(functionsPhp).toContain('larismanis_wa_number');
    expect(functionsPhp).toContain('larismanis_demo_url');
    expect(functionsPhp).toContain('application/ld+json');
    expect(functionsPhp).toContain('SoftwareApplication');
  });

  it('includes all key conversion sections and live demo links in front-page.php and index.php', () => {
    const frontPagePhp = fs.readFileSync(path.join(themeDir, 'front-page.php'), 'utf8');
    const indexPhp = fs.readFileSync(path.join(themeDir, 'index.php'), 'utf8');

    expect(frontPagePhp).toContain('Website komersial pemersatu jalur penjualan online Anda');
    expect(frontPagePhp).toContain('https://demo.larismanis.online');
    expect(frontPagePhp).toContain('Lisensi 1 Website');
    expect(frontPagePhp).toContain('Biaya Operasional Bulanan');
    expect(frontPagePhp).toContain('Rp 150.000');
    expect(frontPagePhp).toContain('Rp 3.000.000');
    expect(frontPagePhp).toContain('selama LarisManis.online beroperasi');
    expect(frontPagePhp).toContain('Domain &amp; Email Custom');
    expect(frontPagePhp).not.toContain('Starter UMKM');
    expect(frontPagePhp).toContain('id="omnichannel"');
    expect(frontPagePhp).toContain('id="masalah"');
    expect(frontPagePhp).toContain('id="fitur"');
    expect(frontPagePhp).toContain('id="demo"');
    expect(frontPagePhp).toContain('id="harga"');
    expect(frontPagePhp).toContain('id="faq"');

    expect(indexPhp).toContain('front-page.php');
  });
});
