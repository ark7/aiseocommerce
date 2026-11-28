<?php
/**
 * Idempotent Seeder for 10 StoryBrand SEO Articles + Blog Page + Clean Permalinks & Sitemap
 * Intended to be executed via PHP CLI inside `marketing-wordpress` container.
 */

if (php_sapi_name() !== 'cli') {
    fwrite(STDERR, "This script must run from CLI.\n");
    exit(1);
}

$_SERVER['HTTP_HOST']   = 'larisdari.web.id';
$_SERVER['SERVER_NAME'] = 'larisdari.web.id';
$_SERVER['HTTPS']       = 'on';

$wp_load = '/var/www/html/wp-load.php';
if (!file_exists($wp_load)) {
    fwrite(STDERR, "[ERROR] wp-load.php not found.\n");
    exit(1);
}

require_once $wp_load;
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$json_path = '/tmp/seo-articles.json';
if (!file_exists($json_path)) {
    fwrite(STDERR, "[ERROR] Missing {$json_path}\n");
    exit(1);
}

$articles = json_decode((string) file_get_contents($json_path), true);
if (!is_array($articles) || count($articles) === 0) {
    fwrite(STDERR, "[ERROR] Invalid JSON in {$json_path}\n");
    exit(1);
}

// 1. Ensure clean permalink structure (/slug-artikel/) + Apache .htaccess rewrite rules
if (get_option('permalink_structure') !== '/%postname%/') {
    update_option('permalink_structure', '/%postname%/');
}

$htaccess_file = ABSPATH . '.htaccess';
$htaccess_rules = "# BEGIN WordPress\n<IfModule mod_rewrite.c>\nRewriteEngine On\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\nRewriteBase /\nRewriteRule ^index\\.php$ - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule . /index.php [L]\n</IfModule>\n# END WordPress\n";
if (!file_exists($htaccess_file) || strpos((string) file_get_contents($htaccess_file), 'RewriteRule . /index.php') === false) {
    file_put_contents($htaccess_file, $htaccess_rules);
    @chown($htaccess_file, 'www-data');
}

// 2. Remove default WordPress boilerplate posts/pages so wp-sitemap.xml stays clean
$cleaned_dummy = 0;
foreach (array('halo-dunia', 'hello-world', 'laman-contoh', 'sample-page', 'privacy-policy') as $dummy_slug) {
    $dummy = get_posts(array(
        'name'        => $dummy_slug,
        'post_type'   => array('post', 'page'),
        'post_status' => array('publish', 'draft', 'trash', 'pending', 'private'),
        'numberposts' => -1,
    ));
    foreach ($dummy as $d) {
        if ($d && isset($d->ID)) {
            wp_delete_post((int) $d->ID, true);
            $cleaned_dummy++;
        }
    }
}

// 3. Upsert /artikel/ page with Daftar Artikel SEO template
$artikel_page = get_page_by_path('artikel', OBJECT, 'page');
$artikel_args = array(
    'post_type'    => 'page',
    'post_name'    => 'artikel',
    'post_title'   => 'Artikel & Panduan Strategi Web Commerce',
    'post_status'  => 'publish',
    'post_content' => '',
    'post_author'  => 1,
);
if ($artikel_page && isset($artikel_page->ID)) {
    $artikel_args['ID'] = (int) $artikel_page->ID;
    $artikel_page_id    = wp_update_post($artikel_args, true);
} else {
    $artikel_page_id = wp_insert_post($artikel_args, true);
}
if (!is_wp_error($artikel_page_id) && $artikel_page_id) {
    update_post_meta((int) $artikel_page_id, '_wp_page_template', 'page-artikel.php');
}

/**
 * Helper to idempotently import an article's JPG into WordPress Media Library.
 */
function ldw_seed_sideload_article_image($image_file, $alt_text, $post_id) {
    $src_path = '/var/www/html/wp-content/themes/larisdari-web-landing/assets/images/articles/' . basename((string) $image_file);
    if (!file_exists($src_path)) {
        return 0;
    }

    $image_key = 'ldw_' . sanitize_file_name(basename((string) $image_file));
    $existing  = get_posts(array(
        'post_type'   => 'attachment',
        'post_status' => 'inherit',
        'meta_key'    => '_ldw_image_key',
        'meta_value'  => $image_key,
        'numberposts' => 1,
    ));

    if (!empty($existing)) {
        $att_id = (int) $existing[0]->ID;
        update_post_meta($att_id, '_wp_attachment_image_alt', (string) $alt_text);
        return $att_id;
    }

    $upload_dir = wp_upload_dir();
    if (!empty($upload_dir['error'])) {
        return 0;
    }

    $filename  = wp_unique_filename($upload_dir['path'], basename($src_path));
    $dest_path = trailingslashit($upload_dir['path']) . $filename;
    if (!@copy($src_path, $dest_path)) {
        return 0;
    }

    $filetype   = wp_check_filetype($filename, null);
    $attachment = array(
        'guid'           => trailingslashit($upload_dir['url']) . $filename,
        'post_mime_type' => $filetype['type'] ?: 'image/jpeg',
        'post_title'     => sanitize_text_field((string) $alt_text),
        'post_content'   => '',
        'post_status'    => 'inherit',
        'post_parent'    => (int) $post_id,
    );

    $att_id = wp_insert_attachment($attachment, $dest_path, (int) $post_id);
    if (is_wp_error($att_id) || !$att_id) {
        return 0;
    }

    $attach_data = wp_generate_attachment_metadata((int) $att_id, $dest_path);
    if (is_array($attach_data)) {
        wp_update_attachment_metadata((int) $att_id, $attach_data);
    }
    update_post_meta((int) $att_id, '_wp_attachment_image_alt', (string) $alt_text);
    update_post_meta((int) $att_id, '_ldw_image_key', $image_key);

    return (int) $att_id;
}

// 4. Upsert categories & all 10 SEO articles
$seeded_count = 0;
$seeded_urls  = array();

foreach ($articles as $item) {
    $slug      = sanitize_title((string) ($item['slug'] ?? ''));
    $title     = sanitize_text_field((string) ($item['title'] ?? ''));
    $seo_title = sanitize_text_field((string) ($item['seoTitle'] ?? $title));
    $seo_desc  = sanitize_text_field((string) ($item['seoDescription'] ?? ''));
    $cat_name  = sanitize_text_field((string) ($item['category'] ?? 'Strategi Omnichannel'));
    $img_file  = (string) ($item['imageFile'] ?? '');
    $img_alt   = sanitize_text_field((string) ($item['imageAlt'] ?? $title));
    $pub_date  = sanitize_text_field((string) ($item['publishedAt'] ?? '2026-11-28 08:00:00'));
    $content   = (string) ($item['contentHtml'] ?? '');

    if ($slug === '' || $title === '' || $content === '') {
        continue;
    }

    // Ensure category exists
    $term = term_exists($cat_name, 'category');
    if (!$term) {
        $term = wp_insert_term($cat_name, 'category');
    }
    $cat_id = is_array($term) && isset($term['term_id']) ? (int) $term['term_id'] : (int) get_option('default_category', 1);

    // Find existing post by slug
    $existing_posts = get_posts(array(
        'name'        => $slug,
        'post_type'   => 'post',
        'post_status' => array('publish', 'draft', 'pending', 'private'),
        'numberposts' => 1,
    ));

    $post_data = array(
        'post_type'     => 'post',
        'post_name'     => $slug,
        'post_title'    => $title,
        'post_excerpt'  => $seo_desc,
        'post_content'  => $content,
        'post_status'   => 'publish',
        'post_author'   => 1,
        'post_date'     => $pub_date,
        'post_date_gmt' => get_gmt_from_date($pub_date),
        'post_category' => array($cat_id),
    );

    if (!empty($existing_posts)) {
        $post_data['ID'] = (int) $existing_posts[0]->ID;
        $post_id = wp_update_post(wp_slash($post_data), true);
    } else {
        $post_id = wp_insert_post(wp_slash($post_data), true);
    }

    if (is_wp_error($post_id) || !$post_id) {
        continue;
    }

    update_post_meta((int) $post_id, '_ldw_seo_title', $seo_title);
    update_post_meta((int) $post_id, '_ldw_seo_description', $seo_desc);

    if ($img_file !== '') {
        $thumb_id = ldw_seed_sideload_article_image($img_file, $img_alt, (int) $post_id);
        if ($thumb_id > 0) {
            set_post_thumbnail((int) $post_id, $thumb_id);
        }
    }

    $seeded_count++;
    $seeded_urls[] = get_permalink((int) $post_id);
}

// 5. Flush rewrite rules so /%postname%/ & /artikel/ resolve immediately
flush_rewrite_rules(true);

echo wp_json_encode(array(
    'status'              => 'ok',
    'permalink_structure' => get_option('permalink_structure'),
    'artikel_page_id'     => is_wp_error($artikel_page_id) ? 0 : (int) $artikel_page_id,
    'cleaned_dummy_posts' => $cleaned_dummy,
    'seeded_articles'     => $seeded_count,
    'urls'                => $seeded_urls,
), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
