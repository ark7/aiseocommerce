<?php
/**
 * LarisDari.web.id Official Landing Theme Functions
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LARISDARI_WEB_THEME_VERSION', '1.6.0');

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
 * Optimize homepage <title> length (57 chars) for Google SERP display without truncation.
 */
function larisdari_web_document_title($title) {
    if (is_front_page() || is_home()) {
        return 'LarisDari.web.id — Website Komersial Omnichannel & AI SEO';
    }
    return $title;
}
add_filter('pre_get_document_title', 'larisdari_web_document_title');

/**
 * Enqueue styles and deferred interactive JS.
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
        array('in_footer' => true, 'strategy' => 'defer')
    );
}
add_action('wp_enqueue_scripts', 'larisdari_web_enqueue_assets');

/**
 * Strip unused Gutenberg block CSS (~14 KB inline styles) on public landing pages.
 */
function larisdari_web_dequeue_unused_styles() {
    if (is_admin()) {
        return;
    }
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    wp_dequeue_style('global-styles');
    wp_dequeue_style('classic-theme-styles');
}
add_action('wp_enqueue_scripts', 'larisdari_web_dequeue_unused_styles', 100);

/**
 * Load Google Fonts asynchronously without render-blocking first paint.
 */
function larisdari_web_async_google_fonts($html, $handle, $href, $media) {
    if ($handle !== 'larisdari-web-google-fonts') {
        return $html;
    }
    $escaped_href = esc_url($href);
    return "<link rel=\"stylesheet\" id=\"larisdari-web-google-fonts-css\" href=\"{$escaped_href}\" media=\"print\" onload=\"this.media='all'\">\n"
        . "<noscript><link rel=\"stylesheet\" href=\"{$escaped_href}\" media=\"{$media}\"></noscript>\n";
}
add_filter('style_loader_tag', 'larisdari_web_async_google_fonts', 10, 4);

/**
 * Remove bloat scripts, RSD/XML-RPC hints, shortlinks, and REST discovery tags.
 */
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('wp_head', 'rest_output_link_wp_head');
remove_action('wp_head', 'wp_oembed_add_discovery_links');
remove_action('template_redirect', 'rest_output_link_header', 11);
add_filter('xmlrpc_enabled', '__return_false');

/**
 * Close public WordPress username enumeration across Sitemap, REST API, and author archives.
 */
function larisdari_web_disable_users_sitemap($provider, $name) {
    if ($name === 'users') {
        return false;
    }
    return $provider;
}
add_filter('wp_sitemaps_add_provider', 'larisdari_web_disable_users_sitemap', 10, 2);

function larisdari_web_hide_public_users_rest($endpoints) {
    if (!is_user_logged_in()) {
        unset($endpoints['/wp/v2/users']);
        unset($endpoints['/wp/v2/users/(?P<id>[\\d]+)']);
    }
    return $endpoints;
}
add_filter('rest_endpoints', 'larisdari_web_hide_public_users_rest');

function larisdari_web_redirect_author_archives() {
    if (is_author() && !is_admin()) {
        wp_safe_redirect(home_url('/'), 301);
        exit;
    }
}
add_action('template_redirect', 'larisdari_web_redirect_author_archives');

/**
 * Output SEO Canonical, Favicon, OpenGraph/Twitter Images, and Schema.org JSON-LD @graph.
 */
function larisdari_web_output_seo_head() {
    $title = wp_get_document_title();
    $desc  = larisdari_web_get_option(
        'larisdari_web_hero_subtitle',
        'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, ongkir Biteship, payment gateway, harga grosir bertingkat, dan AI SEO dalam satu website Anda.'
    );
    $url       = is_singular() ? get_permalink() : home_url('/');
    $demo_url  = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
    $theme_uri = get_template_directory_uri();
    $ver       = '?ver=' . rawurlencode(LARISDARI_WEB_THEME_VERSION);
    $fav_svg   = $theme_uri . '/assets/images/favicon.svg' . $ver;
    $fav_png   = $theme_uri . '/assets/images/favicon-180.png' . $ver;
    $og_image  = $theme_uri . '/assets/images/og-larisdari-web.png' . $ver;

    echo '<link rel="canonical" href="' . esc_url($url) . '">' . "\n";
    echo '<link rel="icon" href="' . esc_url($fav_svg) . '" type="image/svg+xml">' . "\n";
    echo '<link rel="apple-touch-icon" sizes="180x180" href="' . esc_url($fav_png) . '">' . "\n";

    echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:locale" content="id_ID">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($url) . '">' . "\n";
    echo '<meta property="og:site_name" content="LarisDari.web.id">' . "\n";
    echo '<meta property="og:image" content="' . esc_url($og_image) . '">' . "\n";
    echo '<meta property="og:image:width" content="1200">' . "\n";
    echo '<meta property="og:image:height" content="630">' . "\n";
    echo '<meta property="og:image:alt" content="LarisDari.web.id — Website Komersial Pemersatu Jalur Penjualan Online">' . "\n";

    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
    echo '<meta name="twitter:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta name="twitter:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta name="twitter:image" content="' . esc_url($og_image) . '">' . "\n";

    $graph = array(
        '@context' => 'https://schema.org',
        '@graph' => array(
            array(
                '@type' => 'Organization',
                '@id'   => home_url('/#organization'),
                'name'  => 'LarisDari.web.id',
                'url'   => home_url('/'),
                'logo'  => $fav_png,
            ),
            array(
                '@type'       => 'WebSite',
                '@id'         => home_url('/#website'),
                'name'        => 'LarisDari.web.id',
                'url'         => home_url('/'),
                'inLanguage'  => 'id-ID',
                'publisher'   => array('@id' => home_url('/#organization')),
            ),
            array(
                '@type'               => 'SoftwareApplication',
                'name'                => 'LarisDari.web.id',
                'applicationCategory' => 'BusinessApplication',
                'operatingSystem'     => 'Web',
                'url'                 => $url,
                'image'               => $og_image,
                'description'         => $desc,
                'offers'              => array(
                    array(
                        '@type'         => 'Offer',
                        'name'          => 'Lisensi 1 Website (Berlaku selama LarisDari.web.id beroperasi)',
                        'price'         => '3000000',
                        'priceCurrency' => 'IDR',
                        'url'           => home_url('/#pesan'),
                    ),
                    array(
                        '@type'         => 'Offer',
                        'name'          => 'Biaya Operasional Bulanan Website',
                        'price'         => '150000',
                        'priceCurrency' => 'IDR',
                        'url'           => $demo_url,
                    ),
                ),
            ),
            array(
                '@type' => 'FAQPage',
                'mainEntity' => array(
                    array(
                        '@type' => 'Question',
                        'name'  => 'Bagaimana cara kerja biaya lisensi Rp 3.000.000, operasional Rp 150.000/bulan, serta domain & email custom?',
                        'acceptedAnswer' => array(
                            '@type' => 'Answer',
                            'text'  => 'Kami hanya memakai 1 skema harga yang transparan: Anda membeli Lisensi 1 Website sebesar Rp 3.000.000 (berlaku selama LarisDari.web.id beroperasi) untuk memiliki dan mengoperasikan 1 toko online penuh, ditambah Biaya Operasional Bulanan Rp 150.000/bulan agar server dan sistem berjalan optimal setiap bulannya. Untuk domain dan email custom disiapkan dan dibawa oleh masing-masing pengguna.',
                        ),
                    ),
                    array(
                        '@type' => 'Question',
                        'name'  => 'Apakah pembeli di website tetap bisa diarahkan belanja ke Shopee, Tokopedia, atau TikTok Shop kami?',
                        'acceptedAnswer' => array(
                            '@type' => 'Answer',
                            'text'  => 'Bisa. Di setiap produk, Anda dapat mengisi URL Shopee, Tokopedia, dan TikTok Shop. Dengan begitu pembeli bebas memilih checkout langsung di website atau lewat marketplace kepercayaan mereka.',
                        ),
                    ),
                    array(
                        '@type' => 'Question',
                        'name'  => 'Bagaimana cara kerja fitur AI SEO dan AI Studio Foto Produk?',
                        'acceptedAnswer' => array(
                            '@type' => 'Answer',
                            'text'  => 'Anda cukup memasukkan API Key Gemini atau OpenAI pribadi (sistem BYOK/Bring Your Own Key) di halaman Pengaturan Toko, sehingga biaya pemakaian AI sepenuhnya transparan dan efisien tanpa biaya tambahan per-artikel dari kami.',
                        ),
                    ),
                    array(
                        '@type' => 'Question',
                        'name'  => 'Apakah Cloudflare Turnstile di website toko akan mengganggu peringkat SEO Google?',
                        'acceptedAnswer' => array(
                            '@type' => 'Answer',
                            'text'  => 'Tidak. Implementasi Cloudflare Turnstile di toko kami dirancang ramah SEO: pemuatannya ditunda setelah tampilan utama (first impression) selesai dimuat dan otomatis dilewati bagi crawler mesin pencari seperti Googlebot sehingga skor Core Web Vitals dan indeksasi tetap optimal.',
                        ),
                    ),
                    array(
                        '@type' => 'Question',
                        'name'  => 'Bisakah saya mencoba seluruh fitur admin dan checkout sebelum memesan?',
                        'acceptedAnswer' => array(
                            '@type' => 'Answer',
                            'text'  => 'Sangat bisa! Silakan kunjungi ' . $demo_url . ' dan masuk melalui halaman login demo menggunakan tombol 1-klik untuk peran Admin, Staf, atau Pelanggan.',
                        ),
                    ),
                ),
            ),
        ),
    );
    echo '<script type="application/ld+json">' . wp_json_encode($graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
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
            'default' => 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, ongkir Biteship, payment gateway, harga grosir bertingkat, dan AI SEO dalam satu website Anda.',
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
