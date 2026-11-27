<?php
/**
 * LarisDari.web.id Official Landing Theme Functions
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LARISDARI_WEB_THEME_VERSION', '1.4.0');

require_once get_template_directory() . '/inc/cms-admin.php';

/**
 * Prevent stale browser or CDN HTML caching on the public landing page.
 */
function larisdari_web_send_nocache_headers() {
    if (!is_admin()) {
        nocache_headers();
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    }
}
add_action('send_headers', 'larisdari_web_send_nocache_headers');

/**
 * Helper to fetch theme options configured via WP Customizer with safe defaults.
 */
function larisdari_web_get_option($key, $default = '') {
    $val = get_theme_mod($key, $default);
    if (is_string($val) && trim($val) === '') {
        return $default;
    }
    return $val;
}

/**
 * Theme setup supports.
 */
function larisdari_web_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));

    register_nav_menus(array(
        'primary' => __('Menu Utama Header', 'larisdari-web-landing'),
    ));
}
add_action('after_setup_theme', 'larisdari_web_theme_setup');

/**
 * Enqueue styles and lightweight interactive JS.
 */
function larisdari_web_enqueue_assets() {
    wp_enqueue_style(
        'larisdari-web-google-fonts',
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        array(),
        null
    );

    wp_enqueue_style(
        'larisdari-web-landing-style',
        get_stylesheet_uri(),
        array('larisdari-web-google-fonts'),
        LARISDARI_WEB_THEME_VERSION
    );

    wp_enqueue_script(
        'larisdari-web-landing-js',
        get_template_directory_uri() . '/assets/js/landing.js',
        array(),
        LARISDARI_WEB_THEME_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'larisdari_web_enqueue_assets');

/**
 * Remove bloat scripts for faster Core Web Vitals & LCP.
 */
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');

/**
 * Output SEO OpenGraph Meta & SoftwareApplication JSON-LD Schema.
 */
function larisdari_web_output_seo_head() {
    $title = wp_get_document_title();
    $desc  = larisdari_web_get_option(
        'larisdari_web_hero_subtitle',
        'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu website komersial.'
    );
    $url   = home_url('/');
    $demo_url = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');

    echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($url) . '">' . "\n";
    echo '<meta property="og:site_name" content="LarisDari.web.id">' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";

    $schema = array(
        '@context' => 'https://schema.org',
        '@type' => 'SoftwareApplication',
        'name' => 'LarisDari.web.id',
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
add_action('wp_head', 'larisdari_web_output_seo_head', 5);

/**
 * WordPress Customizer settings so Admin can tweak texts & pricing without editing code.
 */
function larisdari_web_customize_register($wp_customize) {
    $wp_customize->add_section('larisdari_web_landing_section', array(
        'title'       => __('Pengaturan Landing Page LarisDari', 'larisdari-web-landing'),
        'priority'    => 25,
        'description' => __('Sesuaikan teks headline, URL demo toko, email kontak, dan rincian harga lisensi tanpa perlu menyentuh kode.', 'larisdari-web-landing'),
    ));

    $fields = array(
        'larisdari_web_badge_text' => array(
            'label'   => 'Badge Hero Promo',
            'default' => 'Platform Webcommerce Omnichannel #1 untuk Brand & UMKM Indonesia',
            'type'    => 'text',
        ),
        'larisdari_web_hero_title' => array(
            'label'   => 'Headline Utama Hero (H1)',
            'default' => 'Website komersial pemersatu jalur penjualan online Anda',
            'type'    => 'text',
        ),
        'larisdari_web_hero_subtitle' => array(
            'label'   => 'Sub-headline Hero',
            'default' => 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu toko online milik Anda sendiri.',
            'type'    => 'textarea',
        ),
        'larisdari_web_demo_url' => array(
            'label'   => 'URL Live Storefront Demo',
            'default' => 'https://demo.larisdari.web.id',
            'type'    => 'url',
        ),
        'larisdari_web_demo_admin_url' => array(
            'label'   => 'URL Login Admin Demo',
            'default' => 'https://demo.larisdari.web.id/login',
            'type'    => 'url',
        ),
        'larisdari_web_contact_email' => array(
            'label'   => 'Email Kontak Resmi',
            'default' => 'halo@larisdari.web.id',
            'type'    => 'email',
        ),
        'larisdari_web_price_monthly' => array(
            'label'   => 'Biaya Operasional Bulanan Website',
            'default' => 'Rp 150.000',
            'type'    => 'text',
        ),
        'larisdari_web_price_lifetime' => array(
            'label'   => 'Biaya Lisensi 1 Website (Selama LarisDari.web.id Beroperasi)',
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
            'section' => 'larisdari_web_landing_section',
            'type'    => $cfg['type'],
        ));
    }
}
add_action('customize_register', 'larisdari_web_customize_register');
