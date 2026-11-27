<?php
/**
 * Theme Footer Template
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

$demo_url       = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
$demo_admin_url = larisdari_web_get_option('larisdari_web_demo_admin_url', 'https://demo.larisdari.web.id/login');
$contact_email  = larisdari_web_get_option('larisdari_web_contact_email', 'halo@larisdari.web.id');
?>

<footer class="lm-footer" role="contentinfo">
  <div class="lm-container">
    <div class="lm-footer-grid">
      <div>
        <a href="<?php echo esc_url(home_url('/')); ?>" class="lm-brand" style="color:#ffffff; margin-bottom:14px;">
          <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/images/logo-dark.svg'); ?>" alt="" width="40" height="40" class="lm-brand-logo" aria-hidden="true" decoding="async" loading="lazy">
          <span>LarisDari<span style="color:#818cf8;">.web.id</span></span>
        </a>
        <p style="margin:0; font-size:0.92rem; max-width:420px; color:#94a3b8;">
          Website komersial pemersatu jalur penjualan online Anda. Menggabungkan kebebasan katalog mandiri dengan integrasi marketplace, AI SEO, kurir nasional Biteship, dan sistem pembayaran lengkap dalam satu platform.
        </p>
      </div>

      <div>
        <h2 class="lm-footer-heading">Platform &amp; Demo</h2>
        <ul>
          <li><a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener">Live Storefront Demo</a></li>
          <li><a href="<?php echo esc_url(rtrim($demo_url, '/') . '/products'); ?>" target="_blank" rel="noopener">Katalog &amp; Harga Grosir</a></li>
          <li><a href="<?php echo esc_url(rtrim($demo_url, '/') . '/articles'); ?>" target="_blank" rel="noopener">Artikel &amp; Panduan SEO</a></li>
          <li><a href="<?php echo esc_url($demo_admin_url); ?>" target="_blank" rel="noopener">Portal Admin Demo (1-Klik)</a></li>
        </ul>
      </div>

      <div>
        <h2 class="lm-footer-heading">Navigasi &amp; Pendaftaran</h2>
        <ul>
          <li><a href="#fitur">Fitur Unggulan</a></li>
          <li><a href="#harga">Skema Harga</a></li>
          <li><a href="#pesan">Form Pemesanan Lisensi</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="mailto:<?php echo esc_attr($contact_email); ?>"><?php echo esc_html($contact_email); ?></a></li>
        </ul>
      </div>
    </div>

    <div class="lm-footer-bottom">
      <span>&copy; <?php echo esc_html(date('Y')); ?> LarisDari.web.id — Seluruh hak cipta dilindungi.</span>
      <span>Didukung oleh arsitektur Managed Webcommerce Omnichannel Indonesia</span>
    </div>
  </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
