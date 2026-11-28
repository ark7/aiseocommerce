<?php
/**
 * LarisDari CMS Admin Module:
 * - On-Page Order/Lead Submission Storage (`lm_lead`)
 * - WP Admin Menu: Data Pemesanan + Klik to Chat WA + Export CSV
 * - WP Admin Menu: Pixel & Analytics Indonesia (GTM, Google Ads, GA4, Meta Pixel, TikTok Pixel)
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

define('LARISDARI_WEB_ANALYTICS_OPTION', 'larisdari_web_analytics_options');
define('LARISDARI_WEB_WEBHOOK_OPTION', 'larisdari_web_webhook_options');

/**
 * Registers internal Custom Post Type `lm_lead` to store landing page orders cleanly.
 */
function larisdari_web_register_lead_cpt() {
    register_post_type('lm_lead', array(
        'labels' => array(
            'name'          => __('Data Pemesanan', 'larisdari-web-landing'),
            'singular_name' => __('Pesanan Masuk', 'larisdari-web-landing'),
        ),
        'public'              => false,
        'show_ui'             => false,
        'show_in_menu'        => false,
        'exclude_from_search' => true,
        'publicly_queryable'  => false,
        'capability_type'     => 'post',
        'supports'            => array('title'),
    ));
}
add_action('init', 'larisdari_web_register_lead_cpt');

/**
 * Returns status label metadata map.
 */
function larisdari_web_get_lead_statuses() {
    return array(
        'BARU'      => array('label' => 'Baru Masuk', 'bg' => '#eef2ff', 'color' => '#4338ca'),
        'DIHUBUNGI' => array('label' => 'Sudah Dihubungi', 'bg' => '#e0f2fe', 'color' => '#0369a1'),
        'FOLLOW_UP' => array('label' => 'Follow-Up', 'bg' => '#fef3c7', 'color' => '#b45309'),
        'CLOSING'   => array('label' => 'Closing / Aktif', 'bg' => '#dcfce7', 'color' => '#15803d'),
        'BATAL'     => array('label' => 'Batal', 'bg' => '#fee2e2', 'color' => '#b91c1c'),
    );
}

/**
 * Normalizes a lead's phone number into an Indonesian Click-to-Chat WhatsApp URL (`wa.me/62...`)
 * pre-filled with a polite follow-up greeting mentioning their name & brand.
 */
function larisdari_web_format_wa_click_url($phone, $name = '', $brand = '', $domain = '') {
    $digits = preg_replace('/[^0-9]/', '', (string) $phone);
    if ($digits === '') {
        return '';
    }
    if (strpos($digits, '0') === 0) {
        $digits = '62' . substr($digits, 1);
    } elseif (strpos($digits, '8') === 0) {
        $digits = '62' . $digits;
    }

    $greeting_name  = trim((string) $name) !== '' ? trim((string) $name) : 'Kak';
    $greeting_brand = trim((string) $brand) !== '' ? trim((string) $brand) : 'toko online Kakak';
    $domain_note    = trim((string) $domain) !== '' ? ' (rencana domain: ' . trim((string) $domain) . ')' : '';

    $message = "Halo Kak {$greeting_name}, terima kasih telah mengisi form pemesanan Lisensi Website LarisDari.web.id untuk brand *{$greeting_brand}*{$domain_note}. Kami dari tim LarisDari.web.id siap membantu proses setup website toko online Kakak. Apakah ada waktu untuk diskusi sebentar?";

    return 'https://wa.me/' . $digits . '?text=' . rawurlencode($message);
}

/**
 * Prevents CSV spreadsheet formula injection when exporting user-submitted values.
 */
function larisdari_web_csv_safe_cell($value) {
    $str = (string) $value;
    if ($str !== '' && in_array($str[0], array('=', '+', '-', '@', "\t", "\r"), true)) {
        return "'" . $str;
    }
    return $str;
}

/**
 * Handles public submission of the #pesan Order/Consultation form.
 */
function larisdari_web_handle_submit_lead() {
    if (
        !isset($_POST['larisdari_web_submit_lead_nonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['larisdari_web_submit_lead_nonce'])), 'larisdari_web_submit_lead_action')
    ) {
        wp_safe_redirect(add_query_arg('lead_error', 'nonce', home_url('/')) . '#pesan');
        exit;
    }

    // Honeypot anti-spam trap: bots filling hidden url field get silently redirected.
    $honeypot = isset($_POST['lm_hp_url']) ? trim((string) wp_unslash($_POST['lm_hp_url'])) : '';
    if ($honeypot !== '') {
        wp_safe_redirect(add_query_arg('lead_submitted', '1', home_url('/')) . '#pesan');
        exit;
    }

    $full_name         = isset($_POST['full_name']) ? sanitize_text_field(wp_unslash($_POST['full_name'])) : '';
    $whatsapp          = isset($_POST['whatsapp']) ? sanitize_text_field(wp_unslash($_POST['whatsapp'])) : '';
    $brand_name        = isset($_POST['brand_name']) ? sanitize_text_field(wp_unslash($_POST['brand_name'])) : '';
    $email             = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $custom_domain     = isset($_POST['custom_domain']) ? sanitize_text_field(wp_unslash($_POST['custom_domain'])) : '';
    $business_category = isset($_POST['business_category']) ? sanitize_text_field(wp_unslash($_POST['business_category'])) : '';
    $license_plan_raw  = isset($_POST['license_plan']) ? strtoupper(sanitize_text_field(wp_unslash($_POST['license_plan']))) : 'OWNED';
    $license_plan      = ($license_plan_raw === 'DEFERRED_6M') ? 'DEFERRED_6M' : 'OWNED';
    $infra_tier_raw    = isset($_POST['infra_tier']) ? strtoupper(sanitize_text_field(wp_unslash($_POST['infra_tier']))) : 'SHARED';
    $infra_tier        = ($infra_tier_raw === 'DEDICATED') ? 'DEDICATED' : 'SHARED';
    $notes             = isset($_POST['notes']) ? sanitize_textarea_field(wp_unslash($_POST['notes'])) : '';
    $utm_source        = isset($_POST['utm_source']) ? sanitize_text_field(wp_unslash($_POST['utm_source'])) : '';
    $utm_medium        = isset($_POST['utm_medium']) ? sanitize_text_field(wp_unslash($_POST['utm_medium'])) : '';
    $utm_campaign      = isset($_POST['utm_campaign']) ? sanitize_text_field(wp_unslash($_POST['utm_campaign'])) : '';

    if ($license_plan === 'OWNED') {
        $initial_amount = ($infra_tier === 'DEDICATED') ? 3350000 : 3150000;
    } else {
        $initial_amount = ($infra_tier === 'DEDICATED') ? 450000 : 200000;
    }

    if ($full_name === '' || $whatsapp === '' || $brand_name === '') {
        wp_safe_redirect(add_query_arg('lead_error', 'required', home_url('/')) . '#pesan');
        exit;
    }

    $post_id = wp_insert_post(array(
        'post_type'   => 'lm_lead',
        'post_status' => 'publish',
        'post_title'  => $full_name . ' — ' . $brand_name,
    ), true);

    if (is_wp_error($post_id) || !$post_id) {
        wp_safe_redirect(add_query_arg('lead_error', 'save', home_url('/')) . '#pesan');
        exit;
    }

    update_post_meta($post_id, '_lm_full_name', $full_name);
    update_post_meta($post_id, '_lm_whatsapp', $whatsapp);
    update_post_meta($post_id, '_lm_brand_name', $brand_name);
    update_post_meta($post_id, '_lm_email', $email);
    update_post_meta($post_id, '_lm_custom_domain', $custom_domain);
    update_post_meta($post_id, '_lm_business_category', $business_category);
    update_post_meta($post_id, '_lm_license_plan', $license_plan);
    update_post_meta($post_id, '_lm_infra_tier', $infra_tier);
    update_post_meta($post_id, '_lm_initial_amount', (string) $initial_amount);
    update_post_meta($post_id, '_lm_notes', $notes);
    update_post_meta($post_id, '_lm_utm_source', $utm_source);
    update_post_meta($post_id, '_lm_utm_medium', $utm_medium);
    update_post_meta($post_id, '_lm_utm_campaign', $utm_campaign);
    update_post_meta($post_id, '_lm_status', 'BARU');

    // Sync to Next.js Control Plane Webhook when configured (graceful fallback if unreachable)
    $order_code  = '';
    $billing_url = '';
    $webhook_opt = get_option(LARISDARI_WEB_WEBHOOK_OPTION, array());
    $webhook_url = (is_array($webhook_opt) && !empty($webhook_opt['webhook_url'])) ? trim((string) $webhook_opt['webhook_url']) : '';
    $webhook_sec = (is_array($webhook_opt) && !empty($webhook_opt['webhook_secret'])) ? trim((string) $webhook_opt['webhook_secret']) : '';

    if ($webhook_url !== '') {
        $resp = wp_remote_post($webhook_url, array(
            'timeout' => 5,
            'headers' => array(
                'Content-Type'             => 'application/json',
                'x-license-webhook-secret' => $webhook_sec,
            ),
            'body'    => wp_json_encode(array(
                'customerName'     => $full_name,
                'whatsapp'         => $whatsapp,
                'brandName'        => $brand_name,
                'email'            => $email,
                'customDomain'     => $custom_domain,
                'businessCategory' => $business_category,
                'licensePlan'      => $license_plan,
                'infraTier'        => $infra_tier,
                'notes'            => $notes,
                'utmSource'        => $utm_source,
                'utmMedium'        => $utm_medium,
                'utmCampaign'      => $utm_campaign,
            )),
        ));
        if (!is_wp_error($resp) && wp_remote_retrieve_response_code($resp) >= 200 && wp_remote_retrieve_response_code($resp) < 300) {
            $decoded = json_decode((string) wp_remote_retrieve_body($resp), true);
            if (is_array($decoded)) {
                $order_code  = isset($decoded['orderCode']) ? sanitize_text_field((string) $decoded['orderCode']) : '';
                $billing_url = isset($decoded['billingUrl']) ? esc_url_raw((string) $decoded['billingUrl']) : '';
                if ($order_code !== '') {
                    update_post_meta($post_id, '_lm_order_code', $order_code);
                }
                if ($billing_url !== '') {
                    update_post_meta($post_id, '_lm_billing_url', $billing_url);
                }
            }
        }
    }

    $redirect_args = array('lead_submitted' => '1');
    if ($order_code !== '') {
        $redirect_args['order_code'] = $order_code;
    }
    if ($billing_url !== '') {
        $redirect_args['billing_url'] = $billing_url;
    }

    wp_safe_redirect(add_query_arg($redirect_args, home_url('/')) . '#pesan');
    exit;
}
add_action('admin_post_nopriv_larisdari_web_submit_lead', 'larisdari_web_handle_submit_lead');
add_action('admin_post_larisdari_web_submit_lead', 'larisdari_web_handle_submit_lead');

/**
 * Handles status update for a lead from the CMS admin table.
 */
function larisdari_web_handle_update_lead_status() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('Akses ditolak.', 'larisdari-web-landing'), 403);
    }

    $lead_id = isset($_POST['lead_id']) ? absint($_POST['lead_id']) : 0;
    if (
        !$lead_id ||
        !isset($_POST['_wpnonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_wpnonce'])), 'larisdari_web_lead_action_' . $lead_id)
    ) {
        wp_die(esc_html__('Token keamanan tidak valid.', 'larisdari-web-landing'), 403);
    }

    $statuses   = larisdari_web_get_lead_statuses();
    $new_status = isset($_POST['status']) ? sanitize_text_field(wp_unslash($_POST['status'])) : 'BARU';
    if (!isset($statuses[$new_status])) {
        $new_status = 'BARU';
    }

    if (get_post_type($lead_id) === 'lm_lead') {
        update_post_meta($lead_id, '_lm_status', $new_status);
    }

    wp_safe_redirect(add_query_arg(array('page' => 'larisdari-web-leads', 'updated' => '1'), admin_url('admin.php')));
    exit;
}
add_action('admin_post_larisdari_web_update_lead_status', 'larisdari_web_handle_update_lead_status');

/**
 * Handles deleting a lead from the CMS admin table.
 */
function larisdari_web_handle_delete_lead() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('Akses ditolak.', 'larisdari-web-landing'), 403);
    }

    $lead_id = isset($_GET['lead_id']) ? absint($_GET['lead_id']) : 0;
    if (
        !$lead_id ||
        !isset($_GET['_wpnonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'larisdari_web_delete_lead_' . $lead_id)
    ) {
        wp_die(esc_html__('Token keamanan tidak valid.', 'larisdari-web-landing'), 403);
    }

    if (get_post_type($lead_id) === 'lm_lead') {
        wp_delete_post($lead_id, true);
    }

    wp_safe_redirect(add_query_arg(array('page' => 'larisdari-web-leads', 'deleted' => '1'), admin_url('admin.php')));
    exit;
}
add_action('admin_post_larisdari_web_delete_lead', 'larisdari_web_handle_delete_lead');

/**
 * Exports all stored leads to CSV for spreadsheet follow-up.
 */
function larisdari_web_handle_export_leads_csv() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('Akses ditolak.', 'larisdari-web-landing'), 403);
    }

    if (
        !isset($_GET['_wpnonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'larisdari_web_export_leads_csv')
    ) {
        wp_die(esc_html__('Token keamanan tidak valid.', 'larisdari-web-landing'), 403);
    }

    $leads = get_posts(array(
        'post_type'      => 'lm_lead',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'orderby'        => 'date',
        'order'          => 'DESC',
    ));

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="larisdari-pemesanan-' . gmdate('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, array('Tanggal', 'Kode Order', 'Nama Lengkap', 'Nama Brand', 'Skema Lisensi', 'Tier Server', 'Tagihan Awal', 'Nomor WhatsApp', 'Email', 'Rencana Domain', 'Kategori Bisnis', 'Catatan', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Status', 'Portal Billing', 'Link Chat WA'));

    foreach ($leads as $lead) {
        $name   = get_post_meta($lead->ID, '_lm_full_name', true);
        $brand  = get_post_meta($lead->ID, '_lm_brand_name', true);
        $wa     = get_post_meta($lead->ID, '_lm_whatsapp', true);
        $domain = get_post_meta($lead->ID, '_lm_custom_domain', true);

        fputcsv($out, array(
            larisdari_web_csv_safe_cell(get_the_date('Y-m-d H:i', $lead)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_order_code', true)),
            larisdari_web_csv_safe_cell($name),
            larisdari_web_csv_safe_cell($brand),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_license_plan', true) ?: 'OWNED'),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_infra_tier', true) ?: 'SHARED'),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_initial_amount', true)),
            larisdari_web_csv_safe_cell($wa),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_email', true)),
            larisdari_web_csv_safe_cell($domain),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_business_category', true)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_notes', true)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_utm_source', true)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_utm_medium', true)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_utm_campaign', true)),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_status', true) ?: 'BARU'),
            larisdari_web_csv_safe_cell(get_post_meta($lead->ID, '_lm_billing_url', true)),
            larisdari_web_csv_safe_cell(larisdari_web_format_wa_click_url($wa, $name, $brand, $domain)),
        ));
    }

    fclose($out);
    exit;
}
add_action('admin_post_larisdari_web_export_leads_csv', 'larisdari_web_handle_export_leads_csv');

/**
 * Registers the top-level "LarisDari CMS" admin menu with Leads & Pixel/Analytics submenus.
 */
function larisdari_web_register_admin_menus() {
    $new_leads = get_posts(array(
        'post_type'      => 'lm_lead',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
        'meta_query'     => array(
            array(
                'key'   => '_lm_status',
                'value' => 'BARU',
            ),
        ),
    ));
    $new_count = count($new_leads);
    $badge     = $new_count > 0 ? ' <span class="awaiting-mod count-' . $new_count . '"><span class="pending-count">' . $new_count . '</span></span>' : '';

    add_menu_page(
        __('Laris Dari Web CMS', 'larisdari-web-landing'),
        'Laris Dari Web CMS' . $badge,
        'manage_options',
        'larisdari-web-leads',
        'larisdari_web_render_leads_page',
        'dashicons-store',
        3
    );

    add_submenu_page(
        'larisdari-web-leads',
        __('Data Pemesanan & Leads', 'larisdari-web-landing'),
        '📋 Data Pemesanan' . $badge,
        'manage_options',
        'larisdari-web-leads',
        'larisdari_web_render_leads_page'
    );

    add_submenu_page(
        'larisdari-web-leads',
        __('Pixel & Analytics Indonesia', 'larisdari-web-landing'),
        '📊 Pixel & Analytics',
        'manage_options',
        'larisdari-web-analytics',
        'larisdari_web_render_analytics_page'
    );
}
add_action('admin_menu', 'larisdari_web_register_admin_menus');

/**
 * Renders the "Data Pemesanan & Leads" page inside WP Admin with 1-click Chat WA buttons.
 */
function larisdari_web_render_leads_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $statuses      = larisdari_web_get_lead_statuses();
    $filter_status = isset($_GET['status']) ? sanitize_text_field(wp_unslash($_GET['status'])) : 'ALL';
    $search_query  = isset($_GET['s']) ? trim(sanitize_text_field(wp_unslash($_GET['s']))) : '';

    $all_leads = get_posts(array(
        'post_type'      => 'lm_lead',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'orderby'        => 'date',
        'order'          => 'DESC',
    ));

    $counts = array(
        'ALL'       => count($all_leads),
        'BARU'      => 0,
        'DIHUBUNGI' => 0,
        'FOLLOW_UP' => 0,
        'CLOSING'   => 0,
        'BATAL'     => 0,
    );

    $filtered_leads = array();
    foreach ($all_leads as $lead) {
        $st = get_post_meta($lead->ID, '_lm_status', true) ?: 'BARU';
        if (isset($counts[$st])) {
            $counts[$st]++;
        }

        if ($filter_status !== 'ALL' && $st !== $filter_status) {
            continue;
        }

        if ($search_query !== '') {
            $haystack = strtolower(
                get_post_meta($lead->ID, '_lm_full_name', true) . ' ' .
                get_post_meta($lead->ID, '_lm_brand_name', true) . ' ' .
                get_post_meta($lead->ID, '_lm_whatsapp', true) . ' ' .
                get_post_meta($lead->ID, '_lm_email', true) . ' ' .
                get_post_meta($lead->ID, '_lm_custom_domain', true)
            );
            if (strpos($haystack, strtolower($search_query)) === false) {
                continue;
            }
        }

        $filtered_leads[] = $lead;
    }

    $export_url = wp_nonce_url(admin_url('admin-post.php?action=larisdari_web_export_leads_csv'), 'larisdari_web_export_leads_csv');
    ?>
    <div class="wrap">
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px;">
        <div>
          <h1 style="margin:0 0 4px; font-weight:700;">📋 Data Pemesanan Lisensi Website (LarisDari.web.id)</h1>
          <p style="margin:0; color:#64748b;">Semua calon pembeli yang mengisi form di halaman utama masuk ke sini. Klik tombol <strong>💬 Chat WA</strong> pada baris pesanan untuk langsung menyapa calon klien.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="<?php echo esc_url($export_url); ?>" class="button button-secondary">📥 Export CSV</a>
          <a href="<?php echo esc_url(admin_url('admin.php?page=larisdari-web-analytics')); ?>" class="button button-primary">📊 Atur Pixel &amp; Analytics</a>
        </div>
      </div>

      <?php if (isset($_GET['updated'])) : ?>
        <div class="notice notice-success is-dismissible"><p>Status pemesanan berhasil diperbarui.</p></div>
      <?php endif; ?>
      <?php if (isset($_GET['deleted'])) : ?>
        <div class="notice notice-info is-dismissible"><p>Data pemesanan telah dihapus.</p></div>
      <?php endif; ?>

      <!-- Summary Stat Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:14px 16px;">
          <div style="font-size:12px; color:#64748b; font-weight:600;">Total Masuk</div>
          <div style="font-size:24px; font-weight:800; color:#0f172a; margin-top:4px;"><?php echo esc_html((string) $counts['ALL']); ?></div>
        </div>
        <div style="background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; padding:14px 16px;">
          <div style="font-size:12px; color:#4338ca; font-weight:600;">Baru Masuk (Perlu Dihubungi)</div>
          <div style="font-size:24px; font-weight:800; color:#312e81; margin-top:4px;"><?php echo esc_html((string) $counts['BARU']); ?></div>
        </div>
        <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:10px; padding:14px 16px;">
          <div style="font-size:12px; color:#92400e; font-weight:600;">Dihubungi / Follow-Up</div>
          <div style="font-size:24px; font-weight:800; color:#78350f; margin-top:4px;"><?php echo esc_html((string) ($counts['DIHUBUNGI'] + $counts['FOLLOW_UP'])); ?></div>
        </div>
        <div style="background:#dcfce7; border:1px solid #bbf7d0; border-radius:10px; padding:14px 16px;">
          <div style="font-size:12px; color:#15803d; font-weight:600;">Closing / Website Aktif</div>
          <div style="font-size:24px; font-weight:800; color:#14532d; margin-top:4px;"><?php echo esc_html((string) $counts['CLOSING']); ?></div>
        </div>
      </div>

      <!-- Filter & Search -->
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
        <ul class="subsubsub" style="margin:0;">
          <li>
            <a href="<?php echo esc_url(admin_url('admin.php?page=larisdari-web-leads&status=ALL')); ?>" class="<?php echo $filter_status === 'ALL' ? 'current' : ''; ?>">
              Semua <span class="count">(<?php echo esc_html((string) $counts['ALL']); ?>)</span>
            </a> |
          </li>
          <?php
          $status_keys = array_keys($statuses);
          foreach ($status_keys as $idx => $st_key) :
              $st_info = $statuses[$st_key];
              $sep = ($idx < count($status_keys) - 1) ? ' |' : '';
              ?>
              <li>
                <a href="<?php echo esc_url(admin_url('admin.php?page=larisdari-web-leads&status=' . $st_key)); ?>" class="<?php echo $filter_status === $st_key ? 'current' : ''; ?>">
                  <?php echo esc_html($st_info['label']); ?> <span class="count">(<?php echo esc_html((string) $counts[$st_key]); ?>)</span>
                </a><?php echo esc_html($sep); ?>
              </li>
          <?php endforeach; ?>
        </ul>

        <form method="get" action="<?php echo esc_url(admin_url('admin.php')); ?>" style="display:flex; gap:6px;">
          <input type="hidden" name="page" value="larisdari-web-leads">
          <input type="hidden" name="status" value="<?php echo esc_attr($filter_status); ?>">
          <input type="search" name="s" value="<?php echo esc_attr($search_query); ?>" placeholder="Cari nama, brand, atau nomor WA..." class="regular-text" style="width:240px;">
          <button type="submit" class="button">Cari</button>
        </form>
      </div>

      <!-- Leads Table -->
      <table class="wp-list-table widefat fixed striped">
        <thead>
          <tr>
            <th style="width:130px;">Tanggal</th>
            <th>Calon Klien &amp; Brand</th>
            <th>WhatsApp &amp; Email</th>
            <th>Domain &amp; Usaha</th>
            <th>Catatan &amp; UTM Iklan</th>
            <th style="width:165px;">Status</th>
            <th style="width:190px;">Aksi (Klik to Chat)</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($filtered_leads)) : ?>
            <tr>
              <td colspan="7" style="text-align:center; padding:32px; color:#64748b;">
                Belum ada data pemesanan yang cocok. Bagikan <code>https://larisdari.web.id/</code> ke kampanye iklan Anda!
              </td>
            </tr>
          <?php else : ?>
            <?php foreach ($filtered_leads as $lead) :
                $full_name   = get_post_meta($lead->ID, '_lm_full_name', true);
                $brand_name  = get_post_meta($lead->ID, '_lm_brand_name', true);
                $whatsapp    = get_post_meta($lead->ID, '_lm_whatsapp', true);
                $email       = get_post_meta($lead->ID, '_lm_email', true);
                $domain      = get_post_meta($lead->ID, '_lm_custom_domain', true);
                $category    = get_post_meta($lead->ID, '_lm_business_category', true);
                $l_plan      = get_post_meta($lead->ID, '_lm_license_plan', true) ?: 'OWNED';
                $l_tier      = get_post_meta($lead->ID, '_lm_infra_tier', true) ?: 'SHARED';
                $l_code      = get_post_meta($lead->ID, '_lm_order_code', true);
                $notes       = get_post_meta($lead->ID, '_lm_notes', true);
                $utm_source  = get_post_meta($lead->ID, '_lm_utm_source', true);
                $utm_camp    = get_post_meta($lead->ID, '_lm_utm_campaign', true);
                $status      = get_post_meta($lead->ID, '_lm_status', true) ?: 'BARU';
                $status_meta = isset($statuses[$status]) ? $statuses[$status] : $statuses['BARU'];
                $wa_url      = larisdari_web_format_wa_click_url($whatsapp, $full_name, $brand_name, $domain);
                $del_url     = wp_nonce_url(admin_url('admin-post.php?action=larisdari_web_delete_lead&lead_id=' . $lead->ID), 'larisdari_web_delete_lead_' . $lead->ID);
                ?>
                <tr>
                  <td>
                    <strong><?php echo esc_html(get_the_date('d M Y', $lead)); ?></strong><br>
                    <span style="color:#64748b; font-size:12px;"><?php echo esc_html(get_the_date('H:i', $lead)); ?> WIB</span>
                    <?php if ($l_code) : ?>
                      <br><code style="font-size:11px;"><?php echo esc_html($l_code); ?></code>
                    <?php endif; ?>
                  </td>
                  <td>
                    <strong style="font-size:14px; color:#0f172a;"><?php echo esc_html($full_name); ?></strong><br>
                    <span style="color:#4f46e5; font-weight:600;"><?php echo esc_html($brand_name); ?></span><br>
                    <span style="font-size:11px; color:#334155; font-weight:600;">
                      <?php echo esc_html(($l_plan === 'DEFERRED_6M' ? 'Tanpa Lisensi 6Bln' : 'Beli Lisensi') . ' • ' . $l_tier); ?>
                    </span>
                  </td>
                  <td>
                    <code><?php echo esc_html($whatsapp); ?></code>
                    <?php if ($email) : ?>
                      <br><span style="font-size:12px; color:#475569;"><?php echo esc_html($email); ?></span>
                    <?php endif; ?>
                  </td>
                  <td>
                    <?php if ($domain) : ?>
                      <strong><?php echo esc_html($domain); ?></strong><br>
                    <?php else : ?>
                      <span style="color:#94a3b8;">Belum sebut domain</span><br>
                    <?php endif; ?>
                    <span style="font-size:12px; color:#64748b;"><?php echo esc_html($category ?: '-'); ?></span>
                  </td>
                  <td>
                    <?php echo $notes ? nl2br(esc_html($notes)) : '<span style="color:#94a3b8;">-</span>'; ?>
                    <?php if ($utm_source || $utm_camp) : ?>
                      <div style="margin-top:6px; font-size:11px; background:#f1f5f9; padding:3px 7px; border-radius:4px; display:inline-block;">
                        UTM: <?php echo esc_html(trim($utm_source . ' / ' . $utm_camp, ' /')); ?>
                      </div>
                    <?php endif; ?>
                  </td>
                  <td>
                    <span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; margin-bottom:6px; background:<?php echo esc_attr($status_meta['bg']); ?>; color:<?php echo esc_attr($status_meta['color']); ?>;">
                      <?php echo esc_html($status_meta['label']); ?>
                    </span>
                    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:flex; gap:4px;">
                      <input type="hidden" name="action" value="larisdari_web_update_lead_status">
                      <input type="hidden" name="lead_id" value="<?php echo esc_attr((string) $lead->ID); ?>">
                      <?php wp_nonce_field('larisdari_web_lead_action_' . $lead->ID); ?>
                      <select name="status" style="font-size:12px; max-width:110px;">
                        <?php foreach ($statuses as $k => $info) : ?>
                          <option value="<?php echo esc_attr($k); ?>" <?php selected($status, $k); ?>>
                            <?php echo esc_html($info['label']); ?>
                          </option>
                        <?php endforeach; ?>
                      </select>
                      <button type="submit" class="button button-small">OK</button>
                    </form>
                  </td>
                  <td>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                      <?php if ($wa_url !== '') : ?>
                        <a
                          href="<?php echo esc_url($wa_url); ?>"
                          target="_blank"
                          rel="noopener"
                          style="display:inline-flex; align-items:center; justify-content:center; gap:6px; background:#16a34a; color:#ffffff; text-decoration:none; padding:7px 10px; border-radius:6px; font-weight:700; font-size:12px;"
                        >
                          💬 Klik to Chat WA
                        </a>
                      <?php endif; ?>
                      <a
                        href="<?php echo esc_url($del_url); ?>"
                        onclick="return confirm('Hapus data pemesanan atas nama <?php echo esc_js($full_name); ?>?');"
                        class="button button-small button-link-delete"
                        style="text-align:center;"
                      >
                        Hapus Data
                      </a>
                    </div>
                  </td>
                </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
    <?php
}

/**
 * Handles saving Pixel & Analytics settings from WP Admin.
 */
function larisdari_web_handle_save_analytics() {
    if (!current_user_can('manage_options')) {
        wp_die(esc_html__('Akses ditolak.', 'larisdari-web-landing'), 403);
    }

    if (
        !isset($_POST['larisdari_web_analytics_nonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['larisdari_web_analytics_nonce'])), 'larisdari_web_save_analytics_action')
    ) {
        wp_die(esc_html__('Token keamanan tidak valid.', 'larisdari-web-landing'), 403);
    }

    $options = array(
        'gtm_id'                  => isset($_POST['gtm_id']) ? sanitize_text_field(wp_unslash($_POST['gtm_id'])) : '',
        'ga4_id'                  => isset($_POST['ga4_id']) ? sanitize_text_field(wp_unslash($_POST['ga4_id'])) : '',
        'gads_id'                 => isset($_POST['gads_id']) ? sanitize_text_field(wp_unslash($_POST['gads_id'])) : '',
        'gads_conversion_label'   => isset($_POST['gads_conversion_label']) ? sanitize_text_field(wp_unslash($_POST['gads_conversion_label'])) : '',
        'meta_pixel_id'           => isset($_POST['meta_pixel_id']) ? sanitize_text_field(wp_unslash($_POST['meta_pixel_id'])) : '',
        'fb_domain_verification'  => isset($_POST['fb_domain_verification']) ? sanitize_text_field(wp_unslash($_POST['fb_domain_verification'])) : '',
        'tiktok_pixel_id'         => isset($_POST['tiktok_pixel_id']) ? sanitize_text_field(wp_unslash($_POST['tiktok_pixel_id'])) : '',
        'gsc_verification'        => isset($_POST['gsc_verification']) ? sanitize_text_field(wp_unslash($_POST['gsc_verification'])) : '',
        'custom_head_script'      => isset($_POST['custom_head_script']) ? trim((string) wp_unslash($_POST['custom_head_script'])) : '',
    );

    update_option(LARISDARI_WEB_ANALYTICS_OPTION, $options);

    $webhook_options = array(
        'webhook_url'    => isset($_POST['webhook_url']) ? esc_url_raw(wp_unslash($_POST['webhook_url'])) : '',
        'webhook_secret' => isset($_POST['webhook_secret']) ? sanitize_text_field(wp_unslash($_POST['webhook_secret'])) : '',
    );
    update_option(LARISDARI_WEB_WEBHOOK_OPTION, $webhook_options);

    wp_safe_redirect(add_query_arg(array('page' => 'larisdari-web-analytics', 'saved' => '1'), admin_url('admin.php')));
    exit;
}
add_action('admin_post_larisdari_web_save_analytics', 'larisdari_web_handle_save_analytics');

/**
 * Renders the "Pixel & Analytics Indonesia" settings page inside WP Admin.
 */
function larisdari_web_render_analytics_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $opt = get_option(LARISDARI_WEB_ANALYTICS_OPTION, array());
    if (!is_array($opt)) {
        $opt = array();
    }
    $wh_opt = get_option(LARISDARI_WEB_WEBHOOK_OPTION, array());
    if (!is_array($wh_opt)) {
        $wh_opt = array();
    }

    $val = function ($key) use ($opt) {
        return isset($opt[$key]) ? (string) $opt[$key] : '';
    };
    $status_pill = function ($active) {
        if ($active) {
            return '<span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:#dcfce7; color:#15803d;">🟢 Aktif</span>';
        }
        return '<span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:#f1f5f9; color:#64748b;">⚪ Belum Diisi</span>';
    };
    ?>
    <div class="wrap" style="max-width:960px;">
      <h1 style="font-weight:700;">📊 Pengaturan Pixel &amp; Analytics Indonesia (<code>larisdari.web.id</code>)</h1>
      <p style="color:#475569;">
        Pasang ID Google Tag Manager, Google Analytics 4, Google Ads, Meta Pixel (Facebook/Instagram), dan TikTok Pixel langsung dari sini. Ketika calon pembeli mengirim Form Pemesanan (<code>#pesan</code>), landing page otomatis mengirim event konversi ke seluruh platform aktif.
      </p>

      <?php if (isset($_GET['saved'])) : ?>
        <div class="notice notice-success is-dismissible"><p><strong>Berhasil disimpan!</strong> Seluruh key Pixel &amp; Analytics telah aktif di halaman <code>https://larisdari.web.id/</code>.</p></div>
      <?php endif; ?>

      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="background:#fff; border:1px solid #cbd5e1; border-radius:12px; padding:24px; margin-top:16px;">
        <input type="hidden" name="action" value="larisdari_web_save_analytics">
        <?php wp_nonce_field('larisdari_web_save_analytics_action', 'larisdari_web_analytics_nonce'); ?>

        <h2 style="margin-top:0; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">1. Google Tag Manager &amp; Google Ecosystem</h2>
        <table class="form-table" role="presentation">
          <tr>
            <th scope="row">
              <label for="gtm_id">Google Tag Manager ID</label><br>
              <?php echo $status_pill($val('gtm_id') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="gtm_id" id="gtm_id" type="text" value="<?php echo esc_attr($val('gtm_id')); ?>" class="regular-text" placeholder="GTM-XXXXXXX">
              <p class="description">Otomatis menyuntikkan script GTM di <code>&lt;head&gt;</code> &amp; <code>&lt;body&gt;</code>, serta mengirim <code>dataLayer.push({ event: 'larisdari_web_lead_submitted' })</code> saat form disubmit.</p>
            </td>
          </tr>
          <tr>
            <th scope="row">
              <label for="ga4_id">Google Analytics 4 (GA4)</label><br>
              <?php echo $status_pill($val('ga4_id') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="ga4_id" id="ga4_id" type="text" value="<?php echo esc_attr($val('ga4_id')); ?>" class="regular-text" placeholder="G-XXXXXXXXXX">
              <p class="description">Measurement ID GA4. Otomatis menembakkan event <code>generate_lead</code> ketika form pemesanan terkirim.</p>
            </td>
          </tr>
          <tr>
            <th scope="row">
              <label for="gads_id">Google Ads Conversion ID &amp; Label</label><br>
              <?php echo $status_pill($val('gads_id') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <div style="display:flex; flex-wrap:wrap; gap:8px;">
                <input name="gads_id" id="gads_id" type="text" value="<?php echo esc_attr($val('gads_id')); ?>" class="regular-text" style="max-width:200px;" placeholder="AW-XXXXXXXXXX">
                <input name="gads_conversion_label" id="gads_conversion_label" type="text" value="<?php echo esc_attr($val('gads_conversion_label')); ?>" class="regular-text" style="max-width:240px;" placeholder="Conversion Label (opsional)">
              </div>
              <p class="description">Contoh ID: <code>AW-123456789</code>. Jika Conversion Label diisi, otomatis menembakkan <code>gtag('event', 'conversion')</code> bernilai Rp 3.000.000 setelah form dikirim.</p>
            </td>
          </tr>
          <tr>
            <th scope="row">
              <label for="gsc_verification">Google Search Console Verification</label><br>
              <?php echo $status_pill($val('gsc_verification') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="gsc_verification" id="gsc_verification" type="text" value="<?php echo esc_attr($val('gsc_verification')); ?>" class="regular-text" placeholder="Kode meta content google-site-verification">
            </td>
          </tr>
        </table>

        <h2 style="margin-top:24px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">2. Iklan Sosial Media Indonesia (Meta &amp; TikTok)</h2>
        <table class="form-table" role="presentation">
          <tr>
            <th scope="row">
              <label for="meta_pixel_id">Meta Pixel ID (FB &amp; IG Ads)</label><br>
              <?php echo $status_pill($val('meta_pixel_id') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="meta_pixel_id" id="meta_pixel_id" type="text" value="<?php echo esc_attr($val('meta_pixel_id')); ?>" class="regular-text" placeholder="123456789012345">
              <p class="description">Otomatis menembakkan event <code>PageView</code> di landing page dan event <code>Lead</code> setelah form pemesanan berhasil dikirim.</p>
            </td>
          </tr>
          <tr>
            <th scope="row">
              <label for="fb_domain_verification">Meta Domain Verification Code</label><br>
              <?php echo $status_pill($val('fb_domain_verification') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="fb_domain_verification" id="fb_domain_verification" type="text" value="<?php echo esc_attr($val('fb_domain_verification')); ?>" class="regular-text" placeholder="Kode meta facebook-domain-verification">
            </td>
          </tr>
          <tr>
            <th scope="row">
              <label for="tiktok_pixel_id">TikTok Pixel ID</label><br>
              <?php echo $status_pill($val('tiktok_pixel_id') !== ''); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </th>
            <td>
              <input name="tiktok_pixel_id" id="tiktok_pixel_id" type="text" value="<?php echo esc_attr($val('tiktok_pixel_id')); ?>" class="regular-text" placeholder="CXXXXXXXXXXXXXXXXXXX">
              <p class="description">Otomatis menembakkan event <code>PageView</code> serta event <code>SubmitForm</code> saat calon pembeli menyelesaikan form pemesanan.</p>
            </td>
          </tr>
        </table>

        <h2 style="margin-top:24px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">3. Custom Head Script (Opsional — Microsoft Clarity, Hotjar, dll.)</h2>
        <table class="form-table" role="presentation">
          <tr>
            <th scope="row"><label for="custom_head_script">Script Tambahan <code>&lt;head&gt;</code></label></th>
            <td>
              <textarea name="custom_head_script" id="custom_head_script" rows="5" class="large-text code" placeholder="<!-- Tempel tag script tambahan di sini bila diperlukan -->"><?php echo esc_textarea($val('custom_head_script')); ?></textarea>
            </td>
          </tr>
        </table>

        <h2 style="margin-top:24px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">4. Sinkronisasi Webhook Order ke Control Plane Next.js</h2>
        <table class="form-table" role="presentation">
          <tr>
            <th scope="row"><label for="webhook_url">Control Plane Webhook URL</label></th>
            <td>
              <input name="webhook_url" id="webhook_url" type="url" value="<?php echo esc_attr(isset($wh_opt['webhook_url']) ? (string) $wh_opt['webhook_url'] : ''); ?>" class="regular-text" placeholder="https://demo.larisdari.web.id/api/webhook/license-order">
              <p class="description">Saat terisi, setiap pesanan baru dari form <code>#pesan</code> otomatis dikirim ke tab Pesanan Lisensi Super-Admin dan menghasilkan link Portal Billing untuk calon pelanggan.</p>
            </td>
          </tr>
          <tr>
            <th scope="row"><label for="webhook_secret">Webhook Secret (<code>LICENSE_WEBHOOK_SECRET</code>)</label></th>
            <td>
              <input name="webhook_secret" id="webhook_secret" type="password" value="<?php echo esc_attr(isset($wh_opt['webhook_secret']) ? (string) $wh_opt['webhook_secret'] : ''); ?>" class="regular-text" placeholder="Secret bersama antara WordPress &amp; Next.js">
            </td>
          </tr>
        </table>

        <p class="submit">
          <button type="submit" class="button button-primary button-large">Simpan Pengaturan Pixel &amp; Analytics</button>
          <a href="<?php echo esc_url(home_url('/')); ?>" target="_blank" rel="noopener" class="button button-secondary button-large" style="margin-left:8px;">Lihat Halaman Publik &rarr;</a>
        </p>
      </form>
    </div>
    <?php
}

/**
 * Outputs configured GTM, GA4, Google Ads, Meta Pixel, TikTok Pixel, and conversion events in <head>.
 */
function larisdari_web_inject_analytics_head() {
    if (is_admin()) {
        return;
    }

    $opt = get_option(LARISDARI_WEB_ANALYTICS_OPTION, array());
    if (!is_array($opt)) {
        return;
    }

    $gtm_id        = !empty($opt['gtm_id']) ? trim((string) $opt['gtm_id']) : '';
    $ga4_id        = !empty($opt['ga4_id']) ? trim((string) $opt['ga4_id']) : '';
    $gads_id       = !empty($opt['gads_id']) ? trim((string) $opt['gads_id']) : '';
    $gads_label    = !empty($opt['gads_conversion_label']) ? trim((string) $opt['gads_conversion_label']) : '';
    $meta_id       = !empty($opt['meta_pixel_id']) ? preg_replace('/[^0-9]/', '', (string) $opt['meta_pixel_id']) : '';
    $fb_verify     = !empty($opt['fb_domain_verification']) ? trim((string) $opt['fb_domain_verification']) : '';
    $tiktok_id     = !empty($opt['tiktok_pixel_id']) ? trim((string) $opt['tiktok_pixel_id']) : '';
    $gsc_verify    = !empty($opt['gsc_verification']) ? trim((string) $opt['gsc_verification']) : '';
    $custom_script = !empty($opt['custom_head_script']) ? (string) $opt['custom_head_script'] : '';
    $lead_success  = isset($_GET['lead_submitted']) && $_GET['lead_submitted'] === '1';

    if ($gsc_verify !== '') {
        echo '<meta name="google-site-verification" content="' . esc_attr($gsc_verify) . '">' . "\n";
    }
    if ($fb_verify !== '') {
        echo '<meta name="facebook-domain-verification" content="' . esc_attr($fb_verify) . '">' . "\n";
    }

    // Google Tag Manager
    if ($gtm_id !== '') : ?>
<script>
window.dataLayer = window.dataLayer || [];
<?php if ($lead_success) : ?>
window.dataLayer.push({ event: 'larisdari_web_lead_submitted', currency: 'IDR', value: 3000000 });
<?php endif; ?>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','<?php echo esc_js($gtm_id); ?>');
</script>
    <?php elseif ($lead_success) : ?>
<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'larisdari_web_lead_submitted', currency: 'IDR', value: 3000000 });</script>
    <?php endif;

    // Google Analytics 4 + Google Ads (gtag.js)
    $primary_gtag = $ga4_id !== '' ? $ga4_id : $gads_id;
    if ($primary_gtag !== '') : ?>
<script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr($primary_gtag); ?>"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  <?php if ($ga4_id !== '') : ?>
  gtag('config', '<?php echo esc_js($ga4_id); ?>');
  <?php endif; ?>
  <?php if ($gads_id !== '') : ?>
  gtag('config', '<?php echo esc_js($gads_id); ?>');
  <?php endif; ?>
  <?php if ($lead_success) : ?>
  gtag('event', 'generate_lead', { currency: 'IDR', value: 3000000 });
    <?php if ($gads_id !== '' && $gads_label !== '') : ?>
  gtag('event', 'conversion', { send_to: '<?php echo esc_js($gads_id . '/' . $gads_label); ?>', value: 3000000, currency: 'IDR' });
    <?php endif; ?>
  <?php endif; ?>
</script>
    <?php endif;

    // Meta / Facebook Pixel
    if ($meta_id !== '') : ?>
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '<?php echo esc_js($meta_id); ?>');
fbq('track', 'PageView');
<?php if ($lead_success) : ?>
fbq('track', 'Lead', { content_name: 'Lisensi Website LarisDari.web.id', currency: 'IDR', value: 3000000 });
<?php endif; ?>
</script>
    <?php endif;

    // TikTok Pixel
    if ($tiktok_id !== '') : ?>
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._i[e]._t=n&&n._t||+new Date,ttq._i[e]._o=n&&n._o||{};var i=document.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};
  ttq.load('<?php echo esc_js($tiktok_id); ?>');
  ttq.page();
  <?php if ($lead_success) : ?>
  ttq.track('SubmitForm', { content_name: 'Lisensi Website LarisDari.web.id', currency: 'IDR', value: 3000000 });
  <?php endif; ?>
}(window, document, 'ttq');
</script>
    <?php endif;

    if ($custom_script !== '') {
        echo $custom_script . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }
}
add_action('wp_head', 'larisdari_web_inject_analytics_head', 20);

/**
 * Outputs GTM <noscript> fallback directly after <body> opens.
 */
function larisdari_web_inject_gtm_noscript() {
    if (is_admin()) {
        return;
    }
    $opt = get_option(LARISDARI_WEB_ANALYTICS_OPTION, array());
    $gtm_id = (is_array($opt) && !empty($opt['gtm_id'])) ? trim((string) $opt['gtm_id']) : '';
    if ($gtm_id !== '') {
        echo '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr($gtm_id) . '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' . "\n";
    }
}
add_action('wp_body_open', 'larisdari_web_inject_gtm_noscript');
