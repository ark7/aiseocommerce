<?php
/**
 * LarisManis.online Official Landing Theme Functions
 *
 * @package larismanis-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LARISMANIS_THEME_VERSION', '1.0.0');

/**
 * Helper to fetch theme options configured via WP Customizer with safe defaults.
 */
function larismanis_get_option($key, $default = '') {
    $val = get_theme_mod($key, $default);
    if (is_string($val) && trim($val) === '') {
        return $default;
    }
    return $val;
}

/**
 * Builds pre-filled WhatsApp consultation link.
 */
function larismanis_whatsapp_url($message = 'Halo Tim LarisManis.online, saya ingin konsultasi pembuatan website toko online omnichannel.') {
    $raw_phone = larismanis_get_option('larismanis_wa_number', '6281288997711');
    $clean_phone = preg_replace('/[^0-9]/', '', (string) $raw_phone);
    if (strpos($clean_phone, '0') === 0) {
        $clean_phone = '62' . substr($clean_phone, 1);
    }
    if (empty($clean_phone)) {
        $clean_phone = '6281288997711';
    }
    return 'https://wa.me/' . $clean_phone . '?text=' . rawurlencode($message);
}

/**
 * Theme setup supports.
 */
function larismanis_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));

    register_nav_menus(array(
        'primary' => __('Menu Utama Header', 'larismanis-landing'),
    ));
}
add_action('after_setup_theme', 'larismanis_theme_setup');

/**
 * Enqueue styles and lightweight interactive JS.
 */
function larismanis_enqueue_assets() {
    wp_enqueue_style(
        'larismanis-google-fonts',
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        array(),
        null
    );

    wp_enqueue_style(
        'larismanis-landing-style',
        get_stylesheet_uri(),
        array('larismanis-google-fonts'),
        LARISMANIS_THEME_VERSION
    );

    wp_enqueue_script(
        'larismanis-landing-js',
        get_template_directory_uri() . '/assets/js/landing.js',
        array(),
        LARISMANIS_THEME_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'larismanis_enqueue_assets');

/**
 * Remove bloat scripts for faster Core Web Vitals & LCP.
 */
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');

/**
 * Output SEO OpenGraph Meta & SoftwareApplication JSON-LD Schema.
 */
function larismanis_output_seo_head() {
    $title = wp_get_document_title();
    $desc  = larismanis_get_option(
        'larismanis_hero_subtitle',
        'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu website komersial.'
    );
    $url   = home_url('/');
    $demo_url = larismanis_get_option('larismanis_demo_url', 'https://demo.larismanis.online');

    echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($url) . '">' . "\n";
    echo '<meta property="og:site_name" content="LarisManis.online">' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";

    $schema = array(
        '@context' => 'https://schema.org',
        '@type' => 'SoftwareApplication',
        'name' => 'LarisManis.online',
        'applicationCategory' => 'BusinessApplication',
        'operatingSystem' => 'Web',
        'url' => $url,
        'description' => $desc,
        'offers' => array(
            '@type' => 'Offer',
            'price' => '150000',
            'priceCurrency' => 'IDR',
            'url' => $demo_url,
        ),
    );
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
}
add_action('wp_head', 'larismanis_output_seo_head', 5);

/**
 * WordPress Customizer settings so Admin can tweak texts, pricing, & WA without editing code.
 */
function larismanis_customize_register($wp_customize) {
    $wp_customize->add_section('larismanis_landing_section', array(
        'title'       => __('Pengaturan Landing Page LarisManis', 'larismanis-landing'),
        'priority'    => 25,
        'description' => __('Sesuaikan teks headline, URL demo toko, nomor WhatsApp sales, dan harga paket tanpa perlu menyentuh kode.', 'larismanis-landing'),
    ));

    $fields = array(
        'larismanis_badge_text' => array(
            'label'   => 'Badge Hero Promo',
            'default' => 'Platform Webcommerce Omnichannel #1 untuk Brand & UMKM Indonesia',
            'type'    => 'text',
        ),
        'larismanis_hero_title' => array(
            'label'   => 'Headline Utama Hero (H1)',
            'default' => 'Website komersial pemersatu jalur penjualan online Anda',
            'type'    => 'text',
        ),
        'larismanis_hero_subtitle' => array(
            'label'   => 'Sub-headline Hero',
            'default' => 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu toko online milik Anda sendiri.',
            'type'    => 'textarea',
        ),
        'larismanis_demo_url' => array(
            'label'   => 'URL Live Storefront Demo',
            'default' => 'https://demo.larismanis.online',
            'type'    => 'url',
        ),
        'larismanis_demo_admin_url' => array(
            'label'   => 'URL Login Admin Demo',
            'default' => 'https://demo.larismanis.online/login',
            'type'    => 'url',
        ),
        'larismanis_wa_number' => array(
            'label'   => 'Nomor WhatsApp Konsultasi (contoh: 6281288997711)',
            'default' => '6281288997711',
            'type'    => 'text',
        ),
        'larismanis_contact_email' => array(
            'label'   => 'Email Kontak Resmi',
            'default' => 'halo@larismanis.online',
            'type'    => 'email',
        ),
        'larismanis_price_monthly' => array(
            'label'   => 'Biaya Operasional Bulanan Website',
            'default' => 'Rp 150.000',
            'type'    => 'text',
        ),
        'larismanis_price_lifetime' => array(
            'label'   => 'Biaya Lisensi 1 Website (Selama LarisManis.online Beroperasi)',
            'default' => 'Rp 3.000.000',
            'type'    => 'text',
        ),
    );

    foreach ($fields as $key => $cfg) {
        $sanitize_cb = ($cfg['type'] === 'url') ? 'esc_url_raw' : (($cfg['type'] === 'textarea') ? 'sanitize_textarea_field' : 'sanitize_text_field');
        $wp_customize->add_setting($key, array(
            'default'           => $cfg['default'],
            'sanitize_callback' => $sanitize_cb,
        ));
        $wp_customize->add_control($key, array(
            'label'   => $cfg['label'],
            'section' => 'larismanis_landing_section',
            'type'    => $cfg['type'],
        ));
    }
}
add_action('customize_register', 'larismanis_customize_register');
