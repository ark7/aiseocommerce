#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy & Activate WordPress Marketing Landing Theme (larisdari-web-landing)
# Targets container `marketing-wordpress` without touching `aiseocommerce-web`.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
THEME_SRC="${REPO_ROOT}/wordpress/themes/larisdari-web-landing"
CONTAINER_NAME="marketing-wordpress"
TARGET_THEME="larisdari-web-landing"

if [ ! -d "${THEME_SRC}" ]; then
  echo "[ERROR] Theme directory not found: ${THEME_SRC}" >&2
  exit 1
fi

if docker ps >/dev/null 2>&1; then
  DOCKER_CMD="docker"
else
  DOCKER_CMD="sudo docker"
fi

if ! ${DOCKER_CMD} ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "[ERROR] Container '${CONTAINER_NAME}' is not running." >&2
  exit 1
fi

echo "[1/3] Syncing theme files into ${CONTAINER_NAME}..."
tar -C "${THEME_SRC}" -cf - . | ${DOCKER_CMD} exec -i "${CONTAINER_NAME}" bash -c \
  "mkdir -p /var/www/html/wp-content/themes/${TARGET_THEME} && tar -xf - -C /var/www/html/wp-content/themes/${TARGET_THEME} && chown -R www-data:www-data /var/www/html/wp-content/themes/${TARGET_THEME}"

echo "[2/3] Ensuring WordPress core is initialized and activating theme '${TARGET_THEME}'..."
${DOCKER_CMD} exec -i "${CONTAINER_NAME}" php <<'PHP'
<?php
$_SERVER['HTTP_HOST'] = 'larisdari.web.id';
$_SERVER['SERVER_NAME'] = 'larisdari.web.id';
$_SERVER['HTTPS'] = 'on';

$wp_config = '/var/www/html/wp-config.php';
$wp_load   = '/var/www/html/wp-load.php';

if (!file_exists($wp_config)) {
    fwrite(STDERR, "[ERROR] wp-config.php not found in WordPress container.\n");
    exit(1);
}

$db_host   = getenv('WORDPRESS_DB_HOST') ?: 'marketing-db:3306';
$db_user   = getenv('WORDPRESS_DB_USER') ?: 'larisdari_web_user';
$db_pass   = getenv('WORDPRESS_DB_PASSWORD') ?: '';
$db_name   = getenv('WORDPRESS_DB_NAME') ?: 'larisdari_web_wp';
$tbl_pref  = getenv('WORDPRESS_TABLE_PREFIX') ?: 'lm_';

$host_parts = explode(':', $db_host, 2);
$mysqli = @new mysqli($host_parts[0], $db_user, $db_pass, $db_name, isset($host_parts[1]) ? (int)$host_parts[1] : 3306);
if ($mysqli->connect_errno) {
    fwrite(STDERR, "[ERROR] Cannot connect to WordPress MariaDB: " . $mysqli->connect_error . "\n");
    exit(1);
}

$options_table = $mysqli->real_escape_string($tbl_pref . 'options');
$res = $mysqli->query("SHOW TABLES LIKE '{$options_table}'");
$already_installed = $res && $res->num_rows > 0;
$mysqli->close();

if (!$already_installed) {
    define('WP_INSTALLING', true);
}

require_once $wp_load;

if (!$already_installed) {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $random_password = wp_generate_password(20, true, true);
    wp_install(
        'LarisDari.web.id — Website komersial pemersatu jalur penjualan online Anda',
        'admin_larisdari_web',
        'halo@larisdari.web.id',
        true,
        '',
        $random_password
    );
    update_option('siteurl', 'https://larisdari.web.id');
    update_option('home', 'https://larisdari.web.id');
    update_option('blogdescription', 'Website komersial pemersatu jalur penjualan online Anda');
    echo "[INFO] WordPress auto-installed with siteurl https://larisdari.web.id.\n";
}

$theme = wp_get_theme('larisdari-web-landing');
if (!$theme->exists()) {
    fwrite(STDERR, "[ERROR] Theme 'larisdari-web-landing' not detected by WordPress.\n");
    exit(1);
}

switch_theme('larisdari-web-landing');
remove_theme_mod('larisdari_web_wa_number');

// Always sync siteurl, home, blogname, and theme_mods on live deploys
update_option('siteurl', 'https://larisdari.web.id');
update_option('home', 'https://larisdari.web.id');
$current_blogname = (string) get_option('blogname', '');
if (trim($current_blogname) === '' || stripos($current_blogname, 'larisdari') === false) {
    update_option('blogname', 'LarisDari.web.id — Website komersial pemersatu jalur penjualan online Anda');
}

$default_mod_updates = array(
    'larisdari_web_demo_url'       => 'https://demo.larisdari.web.id',
    'larisdari_web_demo_admin_url' => 'https://demo.larisdari.web.id/login',
    'larisdari_web_contact_email'  => 'halo@larisdari.web.id',
);
foreach ($default_mod_updates as $mod_key => $mod_target) {
    $existing_mod = get_theme_mod($mod_key);
    if (is_string($existing_mod) && stripos($existing_mod, 'larisdari.web.id') === false && trim($existing_mod) !== '') {
        set_theme_mod($mod_key, $mod_target);
    }
}

echo wp_json_encode(array(
    'status' => 'ok',
    'active_theme' => get_stylesheet(),
    'blogname' => get_option('blogname'),
    'home' => get_option('home'),
), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
PHP

echo "[3/4] Seeding 10 StoryBrand SEO articles & cleaning boilerplate sitemap items..."
if [ -f "${REPO_ROOT}/wordpress/content/seo-articles.json" ] && [ -f "${REPO_ROOT}/scripts/seed-wp-seo-articles.php" ]; then
  ${DOCKER_CMD} cp "${REPO_ROOT}/wordpress/content/seo-articles.json" "${CONTAINER_NAME}:/tmp/seo-articles.json"
  ${DOCKER_CMD} exec -i "${CONTAINER_NAME}" php < "${REPO_ROOT}/scripts/seed-wp-seo-articles.php"
  ${DOCKER_CMD} exec "${CONTAINER_NAME}" rm -f /tmp/seo-articles.json
fi

echo "[4/4] Verifying local WordPress response on http://127.0.0.1:8080/..."
if command -v curl >/dev/null 2>&1; then
  TMP_HTML="$(mktemp)"
  curl -fsS -H "Host: larisdari.web.id" -H "X-Forwarded-Proto: https" http://127.0.0.1:8080/ -o "${TMP_HTML}"
  grep -q "larisdari-web-landing" "${TMP_HTML}"
  if grep -q "Login CMS Admin" "${TMP_HTML}"; then
    rm -f "${TMP_HTML}"
    echo "[ERROR] Exposed Login CMS Admin link still present in rendered HTML." >&2
    exit 1
  fi
  rm -f "${TMP_HTML}"
else
  ${DOCKER_CMD} exec "${CONTAINER_NAME}" php -r '
    $ctx = stream_context_create(["http" => ["header" => "Host: larisdari.web.id\r\nX-Forwarded-Proto: https\r\n"]]);
    $html = file_get_contents("http://127.0.0.1/", false, $ctx);
    if (strpos($html, "larisdari-web-landing") === false) exit(1);
    if (strpos($html, "Login CMS Admin") !== false) exit(1);
  '
fi
echo "✓ WordPress Landing Page deployed and active successfully."
