<?php
/**
 * Theme Header Template
 *
 * @package larismanis-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

$demo_url = larismanis_get_option('larismanis_demo_url', 'https://demo.larismanis.online');
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="lm-header" role="banner">
  <div class="lm-container lm-nav-wrap">
    <a href="<?php echo esc_url(home_url('/')); ?>" class="lm-brand">
      <span class="lm-brand-icon" aria-hidden="true">L</span>
      <span>LarisManis<span class="lm-brand-domain">.online</span></span>
    </a>

    <nav class="lm-nav-desktop" aria-label="Navigasi Utama">
      <a href="#masalah" class="lm-nav-link">Keunggulan</a>
      <a href="#omnichannel" class="lm-nav-link">Integrasi</a>
      <a href="#fitur" class="lm-nav-link">Fitur</a>
      <a href="#demo" class="lm-nav-link">Demo Live</a>
      <a href="#harga" class="lm-nav-link">Harga</a>
      <a href="#pesan" class="lm-nav-link">Pesan Lisensi</a>
      <a href="#faq" class="lm-nav-link">FAQ</a>
    </nav>

    <div class="lm-nav-actions">
      <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline">
        Lihat Demo Toko
      </a>
      <a href="#pesan" class="lm-btn lm-btn-primary">
        Pesan Lisensi &rarr;
      </a>
    </div>

    <button
      type="button"
      id="lm-mobile-toggle"
      class="lm-mobile-toggle"
      aria-expanded="false"
      aria-controls="lm-mobile-drawer"
      aria-label="Buka menu navigasi"
    >
      <span id="lm-toggle-icon" aria-hidden="true">☰</span>
    </button>
  </div>

  <div id="lm-mobile-drawer" class="lm-mobile-drawer" hidden>
    <nav class="lm-mobile-nav-list" aria-label="Menu Mobile">
      <a href="#masalah" class="lm-mobile-nav-link">Keunggulan</a>
      <a href="#omnichannel" class="lm-mobile-nav-link">Integrasi Omnichannel</a>
      <a href="#fitur" class="lm-mobile-nav-link">6 Pilar Fitur</a>
      <a href="#demo" class="lm-mobile-nav-link">Coba Demo Live</a>
      <a href="#harga" class="lm-mobile-nav-link">Skema Harga</a>
      <a href="#pesan" class="lm-mobile-nav-link">Form Pemesanan Lisensi</a>
      <a href="#faq" class="lm-mobile-nav-link">Tanya Jawab (FAQ)</a>
    </nav>
    <div class="lm-mobile-actions">
      <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline">
        Lihat Demo Toko
      </a>
      <a href="#pesan" class="lm-btn lm-btn-primary">
        Isi Form Pemesanan &rarr;
      </a>
    </div>
  </div>
</header>
