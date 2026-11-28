<?php
/**
 * LarisDari.web.id Official Landing Theme Functions
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LARISDARI_WEB_THEME_VERSION', '1.7.0');

require_once get_template_directory() . '/inc/cms-admin.php';

/**
 * Detect whether current request targets XML sitemap feeds.
 */
function larisdari_web_is_sitemap_request() {
    $uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
    if ($uri !== '' && (strpos($uri, 'wp-sitemap') !== false || preg_match('/sitemap[^\/]*\.xml$/i', $uri))) {
        return true;
    }
    return !empty(get_query_var('sitemap')) || !empty(get_query_var('sitemap-subtype'));
}

/**
 * Estimate reading time in minutes (Indonesian ~190 wpm).
 */
function larisdari_web_reading_time($content) {
    $plain = trim(wp_strip_all_tags((string) $content));
    if ($plain === '') {
        return 3;
    }
    $words = count(preg_split('/\s+/u', $plain, -1, PREG_SPLIT_NO_EMPTY));
    return max(1, (int) ceil($words / 190));
}

/**
 * Prevent stale browser or CDN HTML caching on public pages while keeping XML sitemaps cache-friendly for GSC.
 */
function larisdari_web_send_nocache_headers() {
    if (is_admin()) {
        return;
    }
    if (larisdari_web_is_sitemap_request()) {
        header('Cache-Control: public, max-age=3600');
        return;
    }
    nocache_headers();
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
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
 * Optimize <title> length across homepage, single SEO articles, and article hub.
 */
function larisdari_web_document_title($title) {
    if (is_front_page() || is_home()) {
        return 'LarisDari.web.id — Website Komersial Omnichannel & AI SEO';
    }
    if (is_single()) {
        $seo_title = trim((string) get_post_meta(get_the_ID(), '_ldw_seo_title', true));
        if ($seo_title !== '') {
            return $seo_title . ' | LarisDari.web.id';
        }
        return get_the_title() . ' | LarisDari.web.id';
    }
    if (is_page('artikel')) {
        return 'Artikel & Strategi Penjualan Web Commerce | LarisDari.web.id';
    }
    if (is_category()) {
        return single_cat_title('', false) . ' — Panduan Bisnis | LarisDari.web.id';
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

function larisdari_web_hide_empty_taxonomies_sitemap($args) {
    $args['hide_empty'] = true;
    return $args;
}
add_filter('wp_sitemaps_taxonomies_query_args', 'larisdari_web_hide_empty_taxonomies_sitemap');

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
    $title     = wp_get_document_title();
    $demo_url  = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
    $theme_uri = get_template_directory_uri();
    $ver       = '?ver=' . rawurlencode(LARISDARI_WEB_THEME_VERSION);
    $fav_svg   = $theme_uri . '/assets/images/favicon.svg' . $ver;
    $fav_png   = $theme_uri . '/assets/images/favicon-180.png' . $ver;
    $og_image  = $theme_uri . '/assets/images/og-larisdari-web.png' . $ver;
    $og_alt    = 'LarisDari.web.id — Website Komersial Pemersatu Jalur Penjualan Online';
    $og_type   = 'website';

    $desc = larisdari_web_get_option(
        'larisdari_web_hero_subtitle',
        'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, ongkir Biteship, payment gateway, harga grosir bertingkat, dan AI SEO dalam satu website Anda.'
    );
    $url = home_url('/');

    if (is_single()) {
        $post_id = get_the_ID();
        $url     = get_permalink($post_id);
        $og_type = 'article';
        $custom_desc = trim((string) get_post_meta($post_id, '_ldw_seo_description', true));
        if ($custom_desc !== '') {
            $desc = $custom_desc;
        } elseif (has_excerpt($post_id)) {
            $desc = wp_strip_all_tags(get_the_excerpt($post_id));
        } else {
            $desc = wp_trim_words(wp_strip_all_tags(get_post_field('post_content', $post_id)), 24, '...');
        }
        $thumb_id = get_post_thumbnail_id($post_id);
        if ($thumb_id) {
            $post_img = wp_get_attachment_image_url($thumb_id, 'full');
            if ($post_img) {
                $og_image = $post_img;
            }
            $post_alt = trim((string) get_post_meta($thumb_id, '_wp_attachment_image_alt', true));
            if ($post_alt !== '') {
                $og_alt = $post_alt;
            } else {
                $og_alt = get_the_title($post_id);
            }
        }
    } elseif (is_page('artikel')) {
        $url  = home_url('/artikel/');
        $desc = 'Kumpulan panduan strategi web commerce, omnichannel marketplace, Meta & TikTok Ads, harga grosir B2B, dan SEO toko online untuk UMKM Indonesia.';
    } elseif (is_category()) {
        $cat_obj = get_queried_object();
        $url     = get_category_link($cat_obj);
        $cat_desc = trim(wp_strip_all_tags(category_description()));
        $desc    = $cat_desc !== '' ? $cat_desc : 'Kumpulan strategi penjualan digital kategori ' . single_cat_title('', false) . ' dari LarisDari.web.id.';
    } elseif (is_singular()) {
        $url = get_permalink();
    }

    echo '<link rel="canonical" href="' . esc_url($url) . '">' . "\n";
    echo '<link rel="icon" href="' . esc_url($fav_svg) . '" type="image/svg+xml">' . "\n";
    echo '<link rel="apple-touch-icon" sizes="180x180" href="' . esc_url($fav_png) . '">' . "\n";

    echo '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:locale" content="id_ID">' . "\n";
    echo '<meta property="og:type" content="' . esc_attr($og_type) . '">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta property="og:url" content="' . esc_url($url) . '">' . "\n";
    echo '<meta property="og:site_name" content="LarisDari.web.id">' . "\n";
    echo '<meta property="og:image" content="' . esc_url($og_image) . '">' . "\n";
    echo '<meta property="og:image:width" content="1200">' . "\n";
    echo '<meta property="og:image:height" content="' . esc_attr(is_single() ? '675' : '630') . '">' . "\n";
    echo '<meta property="og:image:alt" content="' . esc_attr($og_alt) . '">' . "\n";

    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
    echo '<meta name="twitter:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta name="twitter:description" content="' . esc_attr($desc) . '">' . "\n";
    echo '<meta name="twitter:image" content="' . esc_url($og_image) . '">' . "\n";

    $org_node = array(
        '@type' => 'Organization',
        '@id'   => home_url('/#organization'),
        'name'  => 'LarisDari.web.id',
        'url'   => home_url('/'),
        'logo'  => $fav_png,
    );
    $site_node = array(
        '@type'      => 'WebSite',
        '@id'        => home_url('/#website'),
        'name'       => 'LarisDari.web.id',
        'url'        => home_url('/'),
        'inLanguage' => 'id-ID',
        'publisher'  => array('@id' => home_url('/#organization')),
    );

    $graph_nodes = array($org_node, $site_node);

    if (is_single()) {
        $post_id     = get_the_ID();
        $cats        = get_the_category($post_id);
        $primary_cat = !empty($cats) ? $cats[0] : null;
        $graph_nodes[] = array(
            '@type'            => 'BlogPosting',
            '@id'              => $url . '#article',
            'headline'         => get_the_title($post_id),
            'description'      => $desc,
            'image'            => array($og_image),
            'datePublished'    => get_the_date('c', $post_id),
            'dateModified'     => get_the_modified_date('c', $post_id),
            'inLanguage'       => 'id-ID',
            'mainEntityOfPage' => array('@type' => 'WebPage', '@id' => $url),
            'author'           => array('@type' => 'Organization', 'name' => 'Tim Strategi LarisDari.web.id', 'url' => home_url('/')),
            'publisher'        => array('@id' => home_url('/#organization')),
        );
        $crumb_items = array(
            array('@type' => 'ListItem', 'position' => 1, 'name' => 'Beranda', 'item' => home_url('/')),
            array('@type' => 'ListItem', 'position' => 2, 'name' => 'Artikel', 'item' => home_url('/artikel/')),
        );
        if ($primary_cat) {
            $crumb_items[] = array('@type' => 'ListItem', 'position' => 3, 'name' => $primary_cat->name, 'item' => get_category_link($primary_cat->term_id));
            $crumb_items[] = array('@type' => 'ListItem', 'position' => 4, 'name' => get_the_title($post_id), 'item' => $url);
        } else {
            $crumb_items[] = array('@type' => 'ListItem', 'position' => 3, 'name' => get_the_title($post_id), 'item' => $url);
        }
        $graph_nodes[] = array(
            '@type'           => 'BreadcrumbList',
            'itemListElement' => $crumb_items,
        );
    } elseif (is_page('artikel') || is_category()) {
        $graph_nodes[] = array(
            '@type'       => 'CollectionPage',
            'name'        => $title,
            'description' => $desc,
            'url'         => $url,
            'inLanguage'  => 'id-ID',
            'isPartOf'    => array('@id' => home_url('/#website')),
        );
        $crumb_items = array(
            array('@type' => 'ListItem', 'position' => 1, 'name' => 'Beranda', 'item' => home_url('/')),
            array('@type' => 'ListItem', 'position' => 2, 'name' => 'Artikel', 'item' => home_url('/artikel/')),
        );
        if (is_category()) {
            $crumb_items[] = array('@type' => 'ListItem', 'position' => 3, 'name' => single_cat_title('', false), 'item' => $url);
        }
        $graph_nodes[] = array(
            '@type'           => 'BreadcrumbList',
            'itemListElement' => $crumb_items,
        );
    } else {
        $graph_nodes[] = array(
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
        );
        $graph_nodes[] = array(
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
        );
    }

    $graph = array(
        '@context' => 'https://schema.org',
        '@graph'   => $graph_nodes,
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
