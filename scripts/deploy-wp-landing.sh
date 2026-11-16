#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Deploy & Activate WordPress Marketing Landing Theme (larismanis-landing)
# Targets container `marketing-wordpress` without touching `aiseocommerce-web`.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
THEME_SRC="${REPO_ROOT}/wordpress/themes/larismanis-landing"
CONTAINER_NAME="marketing-wordpress"
TARGET_THEME="larismanis-landing"

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
$_SERVER['HTTP_HOST'] = 'larismanis.online';
$_SERVER['SERVER_NAME'] = 'larismanis.online';
$_SERVER['HTTPS'] = 'on';

$wp_config = '/var/www/html/wp-config.php';
$wp_load   = '/var/www/html/wp-load.php';

if (!file_exists($wp_config)) {
    fwrite(STDERR, "[ERROR] wp-config.php not found in WordPress container.\n");
    exit(1);
}

$db_host   = getenv('WORDPRESS_DB_HOST') ?: 'marketing-db:3306';
$db_user   = getenv('WORDPRESS_DB_USER') ?: 'larismanis_user';
$db_pass   = getenv('WORDPRESS_DB_PASSWORD') ?: '';
$db_name   = getenv('WORDPRESS_DB_NAME') ?: 'larismanis_wp';
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
        'LarisManis.online — Website komersial pemersatu jalur penjualan online Anda',
        'admin_larismanis',
        'halo@larismanis.online',
        true,
        '',
        $random_password
    );
    update_option('siteurl', 'https://larismanis.online');
    update_option('home', 'https://larismanis.online');
    update_option('blogdescription', 'Website komersial pemersatu jalur penjualan online Anda');
    echo "[INFO] WordPress auto-installed with siteurl https://larismanis.online.\n";
}

$theme = wp_get_theme('larismanis-landing');
if (!$theme->exists()) {
    fwrite(STDERR, "[ERROR] Theme 'larismanis-landing' not detected by WordPress.\n");
    exit(1);
}

switch_theme('larismanis-landing');

echo wp_json_encode(array(
    'status' => 'ok',
    'active_theme' => get_stylesheet(),
    'blogname' => get_option('blogname'),
    'home' => get_option('home'),
), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
PHP

echo "[3/3] Verifying local WordPress response on http://127.0.0.1:8080/..."
if command -v curl >/dev/null 2>&1; then
  TMP_HTML="$(mktemp)"
  curl -fsS -H "Host: larismanis.online" -H "X-Forwarded-Proto: https" http://127.0.0.1:8080/ -o "${TMP_HTML}"
  grep -q "larismanis-landing" "${TMP_HTML}"
  rm -f "${TMP_HTML}"
else
  ${DOCKER_CMD} exec "${CONTAINER_NAME}" php -r '
    $ctx = stream_context_create(["http" => ["header" => "Host: larismanis.online\r\nX-Forwarded-Proto: https\r\n"]]);
    $html = file_get_contents("http://127.0.0.1/", false, $ctx);
    if (strpos($html, "larismanis-landing") === false) exit(1);
  '
fi
echo "✓ WordPress Landing Page deployed and active successfully."
