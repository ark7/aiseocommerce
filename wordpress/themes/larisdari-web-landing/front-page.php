<?php
/**
 * Main Landing Page Template for larisdari.web.id
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$badge_text     = larisdari_web_get_option('larisdari_web_badge_text', 'Platform Webcommerce Omnichannel #1 untuk Brand & UMKM Indonesia');
$hero_title     = larisdari_web_get_option('larisdari_web_hero_title', 'Website komersial pemersatu jalur penjualan online Anda');
$hero_subtitle  = larisdari_web_get_option('larisdari_web_hero_subtitle', 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu toko online milik Anda sendiri.');
$demo_url       = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
$demo_admin_url = larisdari_web_get_option('larisdari_web_demo_admin_url', 'https://demo.larisdari.web.id/login');

$price_monthly  = larisdari_web_get_option('larisdari_web_price_monthly', 'Rp 150.000');
$price_lifetime = larisdari_web_get_option('larisdari_web_price_lifetime', 'Rp 3.000.000');

$lead_submitted = isset($_GET['lead_submitted']) && $_GET['lead_submitted'] === '1';
$lead_error     = isset($_GET['lead_error']) ? sanitize_text_field(wp_unslash($_GET['lead_error'])) : '';
?>

<main id="primary">
  <!-- 1. HERO SECTION -->
  <section class="lm-hero">
    <div class="lm-container lm-hero-grid">
      <div>
        <div class="lm-badge">
          <span class="lm-badge-dot" aria-hidden="true"></span>
          <span><?php echo esc_html($badge_text); ?></span>
        </div>

        <h1>
          <?php echo esc_html($hero_title); ?>
        </h1>

        <p class="lm-hero-sub">
          <?php echo esc_html($hero_subtitle); ?>
        </p>

        <div class="lm-hero-cta">
          <a href="#pesan" class="lm-btn lm-btn-primary lm-btn-lg">
            <span>Pesan Lisensi Website</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
          <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline lm-btn-lg">
            <span>Coba Live Storefront Demo</span>
          </a>
        </div>

        <div class="lm-usp-row">
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> Domain &amp; Database Mandiri</span>
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> Terintegrasi Marketplace &amp; Biteship</span>
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> AI SEO &amp; Foto Studio Produk</span>
        </div>
      </div>

      <!-- Visual Interactive Commerce Card -->
      <div class="lm-mockup-card" aria-label="Pratinjau Ekosistem Toko LarisDari.web.id">
        <div class="lm-mockup-topbar">
          <div class="lm-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="lm-mockup-url">https://demo.larisdari.web.id</div>
          <span style="font-size:0.75rem; font-weight:700; color:#10b981;">● Online</span>
        </div>

        <div class="lm-mockup-stats">
          <div class="lm-stat-box">
            <div class="lm-stat-label">Konversi Checkout Mandiri</div>
            <div class="lm-stat-value">+100% Margin</div>
            <span class="lm-stat-tag">Bebas Potongan Komisi Besar</span>
          </div>
          <div class="lm-stat-box">
            <div class="lm-stat-label">Harga Grosir Bertingkat</div>
            <div class="lm-stat-value">Otomatis / Qty</div>
            <span class="lm-stat-tag">Multi-Varian &amp; B2B Ready</span>
          </div>
        </div>

        <div style="font-size:0.78rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px;">
          Jalur Penjualan &amp; Operasional Tersatukan:
        </div>
        <div class="lm-channel-list">
          <div class="lm-channel-pill">🛒 Web Checkout &amp; Kasir</div>
          <div class="lm-channel-pill">🛍️ Shopee • Tokopedia • TikTok</div>
          <div class="lm-channel-pill">🚚 Ongkir Otomatis Biteship</div>
          <div class="lm-channel-pill">💳 Midtrans • Flip • Transfer</div>
          <div class="lm-channel-pill">✨ AI SEO &amp; Image Studio</div>
          <div class="lm-channel-pill">🛡️ Cloudflare Turnstile SEO-Safe</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 2. OMNICHANNEL ECOSYSTEM STRIP -->
  <section id="omnichannel" class="lm-section" style="padding:44px 0;">
    <div class="lm-container">
      <p style="text-align:center; font-size:0.85rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#64748b; margin:0 0 20px;">
        Terhubung dalam Satu Pusat Kendali Penjualan Digital Anda
      </p>
      <div class="lm-eco-strip">
        <span class="lm-eco-badge">🛍️ Shopee</span>
        <span class="lm-eco-badge">🟢 Tokopedia</span>
        <span class="lm-eco-badge">🎵 TikTok Shop</span>
        <span class="lm-eco-badge">🚚 Biteship (JNE • J&amp;T • SiCepat • AnterAja)</span>
        <span class="lm-eco-badge">💳 Midtrans &amp; Flip</span>
        <span class="lm-eco-badge">📲 Notifikasi Telegram &amp; WhatsApp</span>
        <span class="lm-eco-badge">🤖 Gemini &amp; OpenAI BYOK</span>
      </div>
    </div>
  </section>

  <!-- 3. PROBLEM VS SOLUTION -->
  <section id="masalah" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Mengapa LarisDari.web.id?</span>
        <h2>Jangan Taruh Masa Depan Brand Anda di Tangan Algoritma Orang Lain</h2>
        <p>Marketplace tetap penting untuk mendatangkan trafik awal, namun brand yang bertumbuh selalu memiliki website komersial sebagai rumah pusatnya.</p>
      </div>

      <div class="lm-compare-grid">
        <div class="lm-compare-card">
          <h3 class="lm-compare-heading">
            <span class="lm-compare-icon is-warning" aria-hidden="true">⚠️</span>
            <span class="lm-compare-title">Hanya Bergantung pada Marketplace</span>
          </h3>
          <ul class="lm-check-list">
            <li>
              <span class="lm-check-icon is-negative" aria-hidden="true">✕</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Potongan Komisi Terus Naik</strong>
                <span class="lm-check-desc">Biaya administrasi &amp; potongan platform terus meningkat sehingga menekan margin keuntungan bersih Anda.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-negative" aria-hidden="true">✕</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Perang Harga Terbuka</strong>
                <span class="lm-check-desc">Rekomendasi produk kompetitor tepat di bawah etalase Anda memaksa diskon berlebih demi menjaga konversi.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-negative" aria-hidden="true">✕</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Data Pelanggan Tidak Dimiliki Penuh</strong>
                <span class="lm-check-desc">Kontak &amp; riwayat belanja pelanggan dikuasai platform sehingga sulit membangun repeat order mandiri.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-negative" aria-hidden="true">✕</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Keterbatasan Grosir &amp; Pre-Order</strong>
                <span class="lm-check-desc">Sulit menerapkan matriks harga grosir bertingkat per varian sekaligus menerima pesanan pre-order secara rapi.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-negative" aria-hidden="true">✕</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Traffic Iklan Bocor ke Kompetitor</strong>
                <span class="lm-check-desc">Pengunjung dari iklan Meta/TikTok Ads yang masuk ke marketplace langsung terpapar toko serupa milik pesaing.</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="lm-compare-card is-winner">
          <h3 class="lm-compare-heading">
            <span class="lm-compare-icon is-winner" aria-hidden="true">🚀</span>
            <span class="lm-compare-title">Website Komersial LarisDari.web.id</span>
          </h3>
          <ul class="lm-check-list">
            <li>
              <span class="lm-check-icon is-positive" aria-hidden="true">✓</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Satukan Seluruh Kanal</strong>
                <span class="lm-check-desc">Pembeli bisa checkout langsung di web atau klik tombol resmi ke Shopee, Tokopedia, &amp; TikTok Shop Anda.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-positive" aria-hidden="true">✓</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">SEO Organik Google 24 Jam</strong>
                <span class="lm-check-desc">Artikel panduan otomatis terhubung ke kartu produk katalog Anda untuk mendatangkan pembeli organik.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-positive" aria-hidden="true">✓</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Data &amp; Domain Milik Sendiri</strong>
                <span class="lm-check-desc">Bebas atur warna brand, tipografi, pixel pelacakan (Meta, Google GA4, TikTok), dan banner slider.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-positive" aria-hidden="true">✓</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Grosir &amp; Retensi Lebih Tinggi</strong>
                <span class="lm-check-desc">Matriks harga bertingkat per kuantitas dan landing page kampanye iklan terfokus konversi.</span>
              </div>
            </li>
            <li>
              <span class="lm-check-icon is-positive" aria-hidden="true">✓</span>
              <div class="lm-check-body">
                <strong class="lm-check-title">Asisten AI &amp; Pembukuan Terpadu</strong>
                <span class="lm-check-desc">Dari pembuatan foto produk studio, SEO artikel, hingga jurnal kas &amp; laba rugi dalam satu panel.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 4. 6 PILLAR FEATURES -->
  <section id="fitur" class="lm-section">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">6 Pilar Fitur Lengkap</span>
        <h2>Semua Alat Penjualan, AI, Logistik, &amp; Keuangan Siap Pakai</h2>
        <p>Dikembangkan dengan arsitektur web modern (Next.js Storefront + PostgreSQL Cloud) untuk kecepatan tinggi dan kenyamanan belanja.</p>
      </div>

      <div class="lm-features-grid">
        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">🛍️</div>
          <h3>Katalog Omnichannel &amp; Multi-Varian</h3>
          <p>Kelola produk fisik, digital, maupun layanan Pre-Order. Setiap halaman produk dapat menampilkan tombol checkout langsung sekaligus tautan resmi ke Shopee, Tokopedia, dan TikTok Shop.</p>
        </article>

        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">📦</div>
          <h3>Matriks Harga Grosir Bertingkat</h3>
          <p>Atur tarif bertingkat otomatis berdasarkan jumlah pembelian (Batch Pricing) per varian beserta minimum order qty — ideal untuk toko grosir, konveksi, hingga percetakan custom.</p>
        </article>

        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">✨</div>
          <h3>AI SEO Copilot &amp; Photo Studio</h3>
          <p>Gunakan API Key AI Anda sendiri (Gemini / OpenAI BYOK) untuk menulis artikel SEO yang menautkan produk langsung hingga menghasilkan foto katalog produk berlatar studio.</p>
        </article>

        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">🚚</div>
          <h3>Ongkir Biteship &amp; Tarif Flat Manual</h3>
          <p>Pilih penghitungan ongkos kirim real-time ke seluruh kecamatan Indonesia lewat Biteship API (JNE, J&amp;T, SiCepat, AnterAja, TIKI, POS) atau atur tarif flat dalam/luar kota + bebas ongkir.</p>
        </article>

        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">💳</div>
          <h3>Payment Gateway &amp; Notifikasi Bot</h3>
          <p>Terima pembayaran otomatis via Midtrans &amp; Flip maupun unggah bukti transfer manual. Admin langsung menerima notifikasi pesanan &amp; peringatan stok menipis via Telegram, WhatsApp, dan Email SMTP.</p>
        </article>

        <article class="lm-feature-card">
          <div class="lm-feature-icon" aria-hidden="true">🛡️</div>
          <h3>Keuangan Laba Rugi &amp; Anti-Bot SEO</h3>
          <p>Pantau HPP, arus kas harian, dan laporan laba rugi secara akurat, dilengkapi perlindungan Cloudflare Turnstile ramah Googlebot serta pembatas spam (Rate Limiting) di seluruh rute publik.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- 5. INTERACTIVE LIVE DEMO SHOWCASE -->
  <section id="demo" class="lm-section" style="padding-top:16px;">
    <div class="lm-container">
      <div class="lm-demo-banner">
        <div style="max-width:740px;">
          <span class="lm-eyebrow" style="color:#a5b4fc;">Coba Langsung Sekarang</span>
          <h2 style="margin:0 0 12px; font-size:clamp(1.65rem, 3vw, 2.25rem); font-weight:800; color:#ffffff;">
            Rasakan Sendiri Pengalaman Storefront &amp; Panel Admin LarisDari.web.id
          </h2>
          <p style="margin:0; color:#e0e7ff; font-size:1rem;">
            Seluruh alur belanja, matriks harga grosir, multi-card hero slider, dan dashboard pengelolaan tersedia langsung di lingkungan demo online kami.
          </p>
        </div>

        <div class="lm-demo-grid">
          <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-demo-card">
            <div>
              <h3>1. Etalase Beranda &amp; Katalog</h3>
              <p>Lihat tampilan toko modern, Hero Slider, produk pilihan editor, artikel panduan SEO, dan navigasi mobile.</p>
            </div>
            <span class="lm-demo-link">Buka Demo Storefront &rarr;</span>
          </a>

          <a href="<?php echo esc_url(rtrim($demo_url, '/') . '/product/cetak-id-card-pvc-custom'); ?>" target="_blank" rel="noopener" class="lm-demo-card">
            <div>
              <h3>2. Simulasi Harga Grosir Bertingkat</h3>
              <p>Uji perubahan harga satuan otomatis berdasarkan varian dan jumlah kuantitas pada produk Cetak ID Card PVC.</p>
            </div>
            <span class="lm-demo-link">Uji Simulasi Harga &rarr;</span>
          </a>

          <a href="<?php echo esc_url($demo_admin_url); ?>" target="_blank" rel="noopener" class="lm-demo-card">
            <div>
              <h3>3. Portal Admin &amp; Staf (Login 1-Klik)</h3>
              <p>Tersedia tombol pengisi kredensial demo instan untuk mencoba peran Admin Toko, Staf Gudang, maupun Pembeli.</p>
            </div>
            <span class="lm-demo-link">Masuk ke Demo Login &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- 6. PRICING (SINGLE UNIFIED PACKAGE) -->
  <section id="harga" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Satu Skema Harga Jelas</span>
        <h2>1 Paket Lengkap Website Komersial + Biaya Operasional Transparan</h2>
        <p>Tidak ada paket bertingkat yang membingungkan. Semua pengguna mendapatkan 100% fitur lengkap yang sama dengan membeli lisensi 1 website dan membayar biaya operasional bulanan.</p>
      </div>

      <div class="lm-price-card is-featured lm-single-price-card">
        <span class="lm-popular-pill">1 Harga • Semua Fitur Terbuka</span>

        <div>
          <h3 class="lm-price-title" style="font-size:1.35rem; text-align:center;">
            Paket Resmi Website Komersial LarisDari.web.id
          </h3>
          <p class="lm-price-desc" style="text-align:center; margin-bottom:0;">
            Beli lisensi 1 website di awal, lalu cukup bayar biaya operasional setiap bulan untuk menjaga website tetap online optimal.
          </p>

          <div class="lm-price-breakdown-grid">
            <div class="lm-price-component-box is-primary">
              <div class="lm-price-component-kicker">1. Lisensi 1 Website</div>
              <div>
                <span class="lm-price-amount"><?php echo esc_html($price_lifetime); ?></span>
              </div>
              <p class="lm-price-period" style="margin:6px 0 0;">
                Dibayar 1x di awal • Berlaku <strong>selama LarisDari.web.id beroperasi</strong>
              </p>
            </div>

            <div class="lm-price-plus-badge" aria-hidden="true">+</div>

            <div class="lm-price-component-box">
              <div class="lm-price-component-kicker">2. Biaya Operasional Bulanan</div>
              <div>
                <span class="lm-price-amount"><?php echo esc_html($price_monthly); ?></span>
                <span class="lm-price-period"> / bulan</span>
              </div>
              <p class="lm-price-period" style="margin:6px 0 0;">
                Untuk memastikan server, database cloud, &amp; website berjalan lancar dalam 1 bulan
              </p>
            </div>
          </div>

          <div style="margin-top:20px; padding-top:20px; border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 14px; font-size:0.85rem; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.05em;">
              Seluruh Fitur yang Sudah Termasuk Tanpa Tambahan Biaya Paket:
            </p>
            <ul class="lm-feature-checklist-2col">
              <li><span aria-hidden="true">✅</span> <span>1 Website toko komersial mandiri lengkap &amp; terisolasi</span></li>
              <li><span aria-hidden="true">✅</span> <span>Integrasi link Shopee, Tokopedia, dan TikTok Shop</span></li>
              <li><span aria-hidden="true">✅</span> <span>Katalog multi-varian, kategori, &amp; mode Pre-Order</span></li>
              <li><span aria-hidden="true">✅</span> <span>Matriks Harga Grosir Bertingkat (Batch Pricing)</span></li>
              <li><span aria-hidden="true">✅</span> <span>AI SEO Copilot, Artikel SEO, &amp; AI Foto Studio (BYOK)</span></li>
              <li><span aria-hidden="true">✅</span> <span>Cek Ongkir Biteship otomatis &amp; tarif flat dalam/luar kota</span></li>
              <li><span aria-hidden="true">✅</span> <span>Midtrans/Flip + verifikasi bukti transfer &amp; notifikasi WA/Telegram</span></li>
              <li><span aria-hidden="true">✅</span> <span>Pembukuan Kas, HPP, Laba Rugi, &amp; Proteksi Cloudflare Turnstile</span></li>
              <li><span aria-hidden="true">🌐</span> <span><strong>Domain &amp; Email Custom:</strong> dibawa sendiri oleh pengguna</span></li>
              <li><span aria-hidden="true">🤝</span> <span>Pendampingan koneksi DNS domain &amp; SMTP saat onboarding</span></li>
            </ul>
          </div>
        </div>

        <div class="lm-single-price-actions">
          <a href="#pesan" class="lm-btn lm-btn-primary lm-btn-lg" style="flex:1; min-width:240px;">
            Isi Form Pemesanan Lisensi &rarr;
          </a>
          <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline lm-btn-lg">
            Coba Demo Live Dulu
          </a>
        </div>
      </div>

      <div class="lm-pricing-note">
        <strong>📌 Ketentuan Domain &amp; Email Custom:</strong> Domain brand sendiri (misal <code>namatoko.com</code> atau <code>.id</code>) serta akun <strong>Email Custom / SMTP</strong> dibawa dan disiapkan oleh masing-masing pengguna agar aset digital bisnis 100% atas nama Anda. Tim kami membantu menyambungkan DNS &amp; SMTP agar website Anda langsung siap operasional.
      </div>
    </div>
  </section>

  <!-- 7. ORDER FORM (#pesan) -->
  <section id="pesan" class="lm-section">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Pendaftaran &amp; Pemesanan Lisensi</span>
        <h2>Mulai Miliki Website Komersial Anda Sekarang</h2>
        <p>Isi form pemesanan di bawah ini untuk memiliki Lisensi 1 Website (<strong><?php echo esc_html($price_lifetime); ?></strong> + operasional <strong><?php echo esc_html($price_monthly); ?>/bulan</strong>). Data pemesanan Anda langsung tercatat di sistem CMS kami untuk segera ditindaklanjuti.</p>
      </div>

      <div class="lm-order-form-card">
        <?php if ($lead_submitted) : ?>
          <div class="lm-alert-success" role="status">
            <strong>✅ Form Pemesanan Berhasil Dikirim!</strong>
            <p style="margin:6px 0 0;">
              Terima kasih telah mendaftar. Data pemesanan Anda sudah tercatat di sistem CMS kami dan tim LarisDari.web.id akan segera menindaklanjuti pesanan Anda.
            </p>
          </div>
        <?php elseif ($lead_error !== '') : ?>
          <div class="lm-alert-error" role="alert">
            <strong>⚠️ Pengiriman Belum Berhasil</strong>
            <p style="margin:6px 0 0;">
              Pastikan Nama Lengkap, Nomor WhatsApp aktif, dan Nama Brand/Toko sudah diisi dengan benar lalu kirim ulang form.
            </p>
          </div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="lm-order-form">
          <input type="hidden" name="action" value="larisdari_web_submit_lead">
          <?php wp_nonce_field('larisdari_web_submit_lead_action', 'larisdari_web_submit_lead_nonce'); ?>
          <input type="hidden" name="utm_source" id="lm-utm-source" value="">
          <input type="hidden" name="utm_medium" id="lm-utm-medium" value="">
          <input type="hidden" name="utm_campaign" id="lm-utm-campaign" value="">
          <!-- Honeypot anti-spam -->
          <div style="position:absolute; left:-9999px;" aria-hidden="true">
            <label for="lm_hp_url">Website URL</label>
            <input type="text" name="lm_hp_url" id="lm_hp_url" tabindex="-1" autocomplete="off">
          </div>

          <div class="lm-form-grid">
            <div class="lm-field">
              <label for="lm_full_name">Nama Lengkap <span style="color:#dc2626;">*</span></label>
              <input type="text" id="lm_full_name" name="full_name" required class="lm-input" placeholder="Contoh: Budi Santoso">
            </div>

            <div class="lm-field">
              <label for="lm_whatsapp">Nomor WhatsApp Aktif <span style="color:#dc2626;">*</span></label>
              <input type="tel" id="lm_whatsapp" name="whatsapp" required class="lm-input" placeholder="Masukkan nomor WhatsApp aktif Anda">
            </div>

            <div class="lm-field">
              <label for="lm_brand_name">Nama Brand / Toko <span style="color:#dc2626;">*</span></label>
              <input type="text" id="lm_brand_name" name="brand_name" required class="lm-input" placeholder="Contoh: Batik Nusantara Jaya">
            </div>

            <div class="lm-field">
              <label for="lm_email">Alamat Email</label>
              <input type="email" id="lm_email" name="email" class="lm-input" placeholder="Contoh: halo@namatoko.com">
            </div>

            <div class="lm-field">
              <label for="lm_custom_domain">Rencana Nama Domain (Opsional)</label>
              <input type="text" id="lm_custom_domain" name="custom_domain" class="lm-input" placeholder="Contoh: namatoko.com (dibawa oleh user)">
            </div>

            <div class="lm-field">
              <label for="lm_business_category">Kategori Produk / Bisnis</label>
              <select id="lm_business_category" name="business_category" class="lm-select">
                <option value="Fashion &amp; Pakaian">Fashion &amp; Pakaian</option>
                <option value="Kuliner &amp; F&amp;B">Kuliner, Kopi &amp; F&amp;B</option>
                <option value="Percetakan &amp; Grosir B2B">Percetakan, Merchandise &amp; Grosir B2B</option>
                <option value="Elektronik &amp; Gadget">Elektronik &amp; Gadget</option>
                <option value="Kesehatan &amp; Kecantikan">Kesehatan, Herbal &amp; Kecantikan</option>
                <option value="Rumah Tangga &amp; Furniture">Rumah Tangga &amp; Furniture</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div class="lm-field" style="margin-top:16px;">
            <label for="lm_notes">Catatan / Kebutuhan Khusus (Opsional)</label>
            <textarea id="lm_notes" name="notes" rows="3" class="lm-textarea" placeholder="Ceritakan jumlah produk, apakah ingin migrasi katalog, atau pertanyaan lainnya..."></textarea>
          </div>

          <div style="margin-top:22px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
            <p style="margin:0; font-size:0.84rem; color:#64748b;">
              🔒 Data Anda aman dan hanya digunakan untuk menindaklanjuti pemesanan website Anda.
            </p>
            <button type="submit" class="lm-btn lm-btn-primary lm-btn-lg">
              Kirim Form Pemesanan Lisensi &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>

  <!-- 8. FAQ & FINAL CTA -->
  <section id="faq" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Pertanyaan Umum</span>
        <h2>Yang Sering Ditanyakan Sebelum Memulai</h2>
      </div>

      <div class="lm-faq-list">
        <details class="lm-faq-item" open>
          <summary>Bagaimana cara kerja biaya lisensi Rp 3.000.000, operasional Rp 150.000/bulan, serta domain &amp; email custom?</summary>
          <p class="lm-faq-answer">
            Kami hanya memakai 1 skema harga yang transparan: Anda membeli <strong>Lisensi 1 Website sebesar Rp 3.000.000</strong> (berlaku selama LarisDari.web.id beroperasi) untuk memiliki dan mengoperasikan 1 toko online penuh, ditambah <strong>Biaya Operasional Bulanan Rp 150.000/bulan</strong> agar server dan sistem berjalan optimal setiap bulannya. Untuk <strong>domain dan email custom</strong> disiapkan dan dibawa oleh masing-masing pengguna.
          </p>
        </details>

        <details class="lm-faq-item">
          <summary>Apakah pembeli di website tetap bisa diarahkan belanja ke Shopee, Tokopedia, atau TikTok Shop kami?</summary>
          <p class="lm-faq-answer">
            Bisa. Di setiap produk, Anda dapat mengisi URL Shopee, Tokopedia, dan TikTok Shop. Dengan begitu pembeli bebas memilih checkout langsung di website atau lewat marketplace kepercayaan mereka.
          </p>
        </details>

        <details class="lm-faq-item">
          <summary>Bagaimana cara kerja fitur AI SEO dan AI Studio Foto Produk?</summary>
          <p class="lm-faq-answer">
            Anda cukup memasukkan API Key Gemini atau OpenAI pribadi (sistem BYOK/Bring Your Own Key) di halaman Pengaturan Toko, sehingga biaya pemakaian AI sepenuhnya transparan dan efisien tanpa biaya tambahan per-artikel dari kami.
          </p>
        </details>

        <details class="lm-faq-item">
          <summary>Apakah Cloudflare Turnstile di website toko akan mengganggu peringkat SEO Google?</summary>
          <p class="lm-faq-answer">
            Tidak. Implementasi Cloudflare Turnstile di toko kami dirancang ramah SEO: pemuatannya ditunda setelah tampilan utama (*first impression*) selesai dimuat dan otomatis dilewati bagi crawler mesin pencari seperti Googlebot sehingga skor Core Web Vitals dan indeksasi tetap optimal.
          </p>
        </details>

        <details class="lm-faq-item">
          <summary>Bisakah saya mencoba seluruh fitur admin dan checkout sebelum memesan?</summary>
          <p class="lm-faq-answer">
            Sangat bisa! Silakan kunjungi <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" style="color:#4f46e5; font-weight:700; text-decoration:underline;"><?php echo esc_html($demo_url); ?></a> dan masuk melalui halaman login demo menggunakan tombol 1-klik untuk peran Admin, Staf, atau Pelanggan.
          </p>
        </details>
      </div>
    </div>
  </section>
</main>

<?php
get_footer();
