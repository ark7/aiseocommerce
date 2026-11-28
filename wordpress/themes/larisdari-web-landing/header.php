<?php
/**
 * Theme Header Template
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

$demo_url    = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
$anchor_base = (is_front_page() || is_home()) ? '' : trailingslashit(home_url('/'));
$artikel_url = home_url('/artikel/');
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
<a class="lm-skip-link" href="#primary">Langsung ke konten utama</a>

<header class="lm-header" role="banner">
  <div class="lm-container lm-nav-wrap">
    <a href="<?php echo esc_url(home_url('/')); ?>" class="lm-brand">
      <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/images/logo.svg'); ?>" alt="" width="40" height="40" class="lm-brand-logo" aria-hidden="true" decoding="async">
      <span>LarisDari<span class="lm-brand-domain">.web.id</span></span>
    </a>

    <nav class="lm-nav-desktop" aria-label="Navigasi Utama">
      <a href="<?php echo esc_url($anchor_base . '#masalah'); ?>" class="lm-nav-link">Keunggulan</a>
      <a href="<?php echo esc_url($anchor_base . '#omnichannel'); ?>" class="lm-nav-link">Integrasi</a>
      <a href="<?php echo esc_url($anchor_base . '#fitur'); ?>" class="lm-nav-link">Fitur</a>
      <a href="<?php echo esc_url($anchor_base . '#demo'); ?>" class="lm-nav-link">Demo Live</a>
      <a href="<?php echo esc_url($anchor_base . '#harga'); ?>" class="lm-nav-link">Harga</a>
      <a href="<?php echo esc_url($artikel_url); ?>" class="lm-nav-link">Artikel</a>
      <a href="<?php echo esc_url($anchor_base . '#pesan'); ?>" class="lm-nav-link">Pesan Lisensi</a>
      <a href="<?php echo esc_url($anchor_base . '#faq'); ?>" class="lm-nav-link">FAQ</a>
    </nav>

    <div class="lm-nav-actions">
      <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline">
        Lihat Demo Toko
      </a>
      <a href="<?php echo esc_url($anchor_base . '#pesan'); ?>" class="lm-btn lm-btn-primary">
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
      <a href="<?php echo esc_url($anchor_base . '#masalah'); ?>" class="lm-mobile-nav-link">Keunggulan</a>
      <a href="<?php echo esc_url($anchor_base . '#omnichannel'); ?>" class="lm-mobile-nav-link">Integrasi Omnichannel</a>
      <a href="<?php echo esc_url($anchor_base . '#fitur'); ?>" class="lm-mobile-nav-link">6 Pilar Fitur</a>
      <a href="<?php echo esc_url($anchor_base . '#demo'); ?>" class="lm-mobile-nav-link">Coba Demo Live</a>
      <a href="<?php echo esc_url($anchor_base . '#harga'); ?>" class="lm-mobile-nav-link">Skema Harga</a>
      <a href="<?php echo esc_url($artikel_url); ?>" class="lm-mobile-nav-link">Artikel &amp; Strategi SEO</a>
      <a href="<?php echo esc_url($anchor_base . '#pesan'); ?>" class="lm-mobile-nav-link">Form Pemesanan Lisensi</a>
      <a href="<?php echo esc_url($anchor_base . '#faq'); ?>" class="lm-mobile-nav-link">Tanya Jawab (FAQ)</a>
    </nav>
    <div class="lm-mobile-actions">
      <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline">
        Lihat Demo Toko
      </a>
      <a href="<?php echo esc_url($anchor_base . '#pesan'); ?>" class="lm-btn lm-btn-primary">
        Isi Form Pemesanan &rarr;
      </a>
    </div>
  </div>
</header>
