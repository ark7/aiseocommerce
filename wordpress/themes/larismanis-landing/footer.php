<?php
/**
 * Theme Footer Template
 *
 * @package larismanis-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

$demo_url       = larismanis_get_option('larismanis_demo_url', 'https://demo.larismanis.online');
$demo_admin_url = larismanis_get_option('larismanis_demo_admin_url', 'https://demo.larismanis.online/login');
$contact_email  = larismanis_get_option('larismanis_contact_email', 'halo@larismanis.online');
?>

<footer class="lm-footer" role="contentinfo">
  <div class="lm-container">
    <div class="lm-footer-grid">
      <div>
        <a href="<?php echo esc_url(home_url('/')); ?>" class="lm-brand" style="color:#ffffff; margin-bottom:14px;">
          <span class="lm-brand-icon" aria-hidden="true">L</span>
          <span>LarisManis<span style="color:#818cf8;">.online</span></span>
        </a>
        <p style="margin:0; font-size:0.92rem; max-width:420px; color:#94a3b8;">
          Website komersial pemersatu jalur penjualan online Anda. Menggabungkan kebebasan katalog mandiri dengan integrasi marketplace, AI SEO, kurir nasional Biteship, dan sistem pembayaran lengkap dalam satu platform.
        </p>
      </div>

      <div>
        <h4>Platform &amp; Demo</h4>
        <ul>
          <li><a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener">Live Storefront Demo</a></li>
          <li><a href="<?php echo esc_url(rtrim($demo_url, '/') . '/products'); ?>" target="_blank" rel="noopener">Katalog &amp; Harga Grosir</a></li>
          <li><a href="<?php echo esc_url(rtrim($demo_url, '/') . '/articles'); ?>" target="_blank" rel="noopener">Artikel &amp; Panduan SEO</a></li>
          <li><a href="<?php echo esc_url($demo_admin_url); ?>" target="_blank" rel="noopener">Portal Admin Demo (1-Klik)</a></li>
        </ul>
      </div>

      <div>
        <h4>Navigasi &amp; Pendaftaran</h4>
        <ul>
          <li><a href="#fitur">Fitur Unggulan</a></li>
          <li><a href="#harga">Skema Harga</a></li>
          <li><a href="#pesan">Form Pemesanan Lisensi</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="mailto:<?php echo esc_attr($contact_email); ?>"><?php echo esc_html($contact_email); ?></a></li>
          <li><a href="<?php echo esc_url(admin_url('admin.php?page=larismanis-leads')); ?>">Login CMS Admin</a></li>
        </ul>
      </div>
    </div>

    <div class="lm-footer-bottom">
      <span>&copy; <?php echo esc_html(date('Y')); ?> LarisManis.online — Seluruh hak cipta dilindungi.</span>
      <span>Didukung oleh arsitektur Managed Webcommerce Omnichannel Indonesia</span>
    </div>
  </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
