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
$hero_subtitle  = larisdari_web_get_option('larisdari_web_hero_subtitle', 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, ongkir Biteship, payment gateway, harga grosir bertingkat, dan AI SEO dalam satu website Anda.');
$demo_url       = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
$demo_admin_url = larisdari_web_get_option('larisdari_web_demo_admin_url', 'https://demo.larisdari.web.id/login');

$price_monthly            = larisdari_web_get_option('larisdari_web_price_monthly', 'Rp 150.000');
$price_dedicated_owned    = larisdari_web_get_option('larisdari_web_price_dedicated_owned', 'Rp 350.000');
$price_shared_deferred    = larisdari_web_get_option('larisdari_web_price_shared_deferred', 'Rp 200.000');
$price_dedicated_deferred = larisdari_web_get_option('larisdari_web_price_dedicated_deferred', 'Rp 450.000');
$price_lifetime           = larisdari_web_get_option('larisdari_web_price_lifetime', 'Rp 3.000.000');

$lead_submitted = isset($_GET['lead_submitted']) && $_GET['lead_submitted'] === '1';
$lead_order_code = isset($_GET['order_code']) ? sanitize_text_field(wp_unslash($_GET['order_code'])) : '';
$lead_billing_url = isset($_GET['billing_url']) ? esc_url_raw(wp_unslash($_GET['billing_url'])) : '';
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
          <span class="lm-usp-item"><span class="lm-usp-check" aria-hidden="true">✓</span> Domain &amp; Database Mandiri</span>
          <span class="lm-usp-item"><span class="lm-usp-check" aria-hidden="true">✓</span> Terintegrasi Marketplace &amp; Biteship</span>
          <span class="lm-usp-item"><span class="lm-usp-check" aria-hidden="true">✓</span> AI SEO &amp; Foto Studio Produk</span>
        </div>
      </div>

      <!-- Visual Interactive Commerce Card -->
      <div class="lm-mockup-card" aria-label="Pratinjau Ekosistem Toko LarisDari.web.id">
        <div class="lm-mockup-topbar">
          <div class="lm-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="lm-mockup-url">https://demo.larisdari.web.id</div>
          <span style="font-size:0.75rem; font-weight:700; color:#047857;"><span aria-hidden="true">●</span> Online</span>
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
          <div class="lm-channel-pill"><span aria-hidden="true">🛒</span> Web Checkout &amp; Kasir</div>
          <div class="lm-channel-pill"><span aria-hidden="true">🛍️</span> Shopee • Tokopedia • TikTok</div>
          <div class="lm-channel-pill"><span aria-hidden="true">🚚</span> Ongkir Otomatis Biteship</div>
          <div class="lm-channel-pill"><span aria-hidden="true">💳</span> Midtrans • Flip • Transfer</div>
          <div class="lm-channel-pill"><span aria-hidden="true">✨</span> AI SEO &amp; Image Studio</div>
          <div class="lm-channel-pill"><span aria-hidden="true">🛡️</span> Cloudflare Turnstile SEO-Safe</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 2. OMNICHANNEL ECOSYSTEM STRIP -->
  <section id="omnichannel" class="lm-section" style="padding:44px 0;">
    <div class="lm-container">
      <p style="text-align:center; font-size:0.85rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#475569; margin:0 0 20px;">
        Terhubung dalam Satu Pusat Kendali Penjualan Digital Anda
      </p>
      <div class="lm-eco-strip">
        <span class="lm-eco-badge"><span aria-hidden="true">🛍️</span> Shopee</span>
        <span class="lm-eco-badge"><span aria-hidden="true">🟢</span> Tokopedia</span>
        <span class="lm-eco-badge"><span aria-hidden="true">🎵</span> TikTok Shop</span>
        <span class="lm-eco-badge"><span aria-hidden="true">🚚</span> Biteship (JNE • J&amp;T • SiCepat • AnterAja)</span>
        <span class="lm-eco-badge"><span aria-hidden="true">💳</span> Midtrans &amp; Flip</span>
        <span class="lm-eco-badge"><span aria-hidden="true">📲</span> Notifikasi Telegram &amp; WhatsApp</span>
        <span class="lm-eco-badge"><span aria-hidden="true">🤖</span> Gemini &amp; OpenAI BYOK</span>
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

  <!-- 6. PRICING MATRIX (2x2: OWNED vs DEFERRED_6M x SHARED vs DEDICATED) -->
  <section id="harga" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Skema Harga Transparan &amp; Fleksibel</span>
        <h2>Pilih Beli Lisensi di Awal atau Mulai Ringan Tanpa Lisensi</h2>
        <p>Semua paket mendapatkan 100% fitur lengkap yang sama, wajib menggunakan <strong>Custom Domain brand Anda</strong>, serta <strong>GRATIS Support Setting penuh oleh tim kami</strong> sampai website siap jualan.</p>
      </div>

      <div class="lm-price-matrix-grid">
        <!-- SKEMA 1: BELI LISENSI DI AWAL -->
        <div class="lm-price-card is-featured">
          <span class="lm-popular-pill">Paling Hemat Jangka Panjang</span>
          <div>
            <h3 class="lm-price-title" style="font-size:1.3rem;">
              1. Beli Lisensi di Awal (<?php echo esc_html($price_lifetime); ?>)
            </h3>
            <p class="lm-price-desc">
              Bayar lisensi 1 website 1× di awal (berlaku selama LarisDari.web.id beroperasi) + biaya operasional bulanan paling rendah sesuai infrastruktur pilihan Anda.
            </p>

            <div class="lm-price-component-box is-primary" style="padding:14px 16px;">
              <div class="lm-price-component-kicker">Harga Lisensi 1 Website • 1× di Awal</div>
              <div>
                <span class="lm-price-amount" style="font-size:1.65rem;"><?php echo esc_html($price_lifetime); ?></span>
                <span class="lm-price-period"> • Gratis Setting Custom Domain</span>
              </div>
            </div>

            <div class="lm-tier-options-grid">
              <div class="lm-tier-box">
                <div>
                  <div class="lm-tier-kicker">Shared Infrastructure</div>
                  <div class="lm-tier-price"><?php echo esc_html($price_monthly); ?><span class="lm-price-period"> / bln</span></div>
                  <p class="lm-tier-note">Ideal untuk brand &amp; UMKM berkembang di server cloud bersama terisolasi.</p>
                </div>
                <a href="#pesan" class="lm-btn lm-btn-outline" data-select-plan="OWNED" data-select-tier="SHARED" style="width:100%;">
                  Pilih Owned Shared
                </a>
              </div>

              <div class="lm-tier-box is-dedicated">
                <div>
                  <div class="lm-tier-kicker">Dedicated Infrastructure</div>
                  <div class="lm-tier-price"><?php echo esc_html($price_dedicated_owned); ?><span class="lm-price-period"> / bln</span></div>
                  <p class="lm-tier-note">Resource VPS &amp; database tersendiri untuk trafik iklan &amp; transaksi tinggi.</p>
                </div>
                <a href="#pesan" class="lm-btn lm-btn-primary" data-select-plan="OWNED" data-select-tier="DEDICATED" style="width:100%;">
                  Pilih Owned Dedicated
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- SKEMA 2: MULAI TANPA LISENSI AWAL -->
        <div class="lm-price-card">
          <div>
            <h3 class="lm-price-title" style="font-size:1.3rem;">
              2. Mulai Tanpa Lisensi Awal (Tebus &le; 6 Bulan)
            </h3>
            <p class="lm-price-desc">
              Solusi ringan agar toko langsung online tanpa keluar biaya lisensi di hari pertama. Lisensi <strong><?php echo esc_html($price_lifetime); ?> wajib dibayar maksimal di bulan ke-6</strong> — jika melewati bulan ke-6 belum ditebus, layanan otomatis dinonaktifkan (OFF).
            </p>

            <div class="lm-price-component-box" style="padding:14px 16px; background:#fffbeb; border-color:#fde68a;">
              <div class="lm-price-component-kicker" style="color:#b45309;">Mulai Ringan Hari Pertama • Gratis Setting Custom Domain</div>
              <p style="margin:2px 0 0; font-size:0.86rem; color:#78350f; font-weight:600;">
                Setelah menebus lisensi <?php echo esc_html($price_lifetime); ?> (&le; bulan ke-6), tarif bulanan otomatis turun ke <?php echo esc_html($price_monthly); ?> / <?php echo esc_html($price_dedicated_owned); ?>.
              </p>
            </div>

            <div class="lm-tier-options-grid">
              <div class="lm-tier-box">
                <div>
                  <div class="lm-tier-kicker">Shared (Tanpa Lisensi)</div>
                  <div class="lm-tier-price"><?php echo esc_html($price_shared_deferred); ?><span class="lm-price-period"> / bln</span></div>
                  <p class="lm-tier-note">Turun ke <?php echo esc_html($price_monthly); ?>/bln setelah tebus lisensi maks. bulan ke-6.</p>
                </div>
                <a href="#pesan" class="lm-btn lm-btn-outline" data-select-plan="DEFERRED_6M" data-select-tier="SHARED" style="width:100%;">
                  Pilih Shared 6 Bln
                </a>
              </div>

              <div class="lm-tier-box is-dedicated">
                <div>
                  <div class="lm-tier-kicker">Dedicated (Tanpa Lisensi)</div>
                  <div class="lm-tier-price"><?php echo esc_html($price_dedicated_deferred); ?><span class="lm-price-period"> / bln</span></div>
                  <p class="lm-tier-note">Turun ke <?php echo esc_html($price_dedicated_owned); ?>/bln setelah tebus lisensi maks. bulan ke-6.</p>
                </div>
                <a href="#pesan" class="lm-btn lm-btn-primary" data-select-plan="DEFERRED_6M" data-select-tier="DEDICATED" style="width:100%;">
                  Pilih Dedicated 6 Bln
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lm-included-banner">
        <p style="margin:0 0 14px; font-size:0.85rem; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.05em;">
          Seluruh Fitur &amp; Dukungan yang Sudah Termasuk di Semua Skenario:
        </p>
        <ul class="lm-feature-checklist-2col">
          <li><span aria-hidden="true">✅</span> <span><strong>Gratis Support Setting Penuh:</strong> DNS Custom Domain, SSL, SMTP, kurir &amp; payment disiapkan tim kami</span></li>
          <li><span aria-hidden="true">✅</span> <span>Integrasi link Shopee, Tokopedia, dan TikTok Shop + keranjang mandiri</span></li>
          <li><span aria-hidden="true">✅</span> <span>Katalog multi-varian, kategori, Pre-Order, &amp; Harga Grosir Bertingkat</span></li>
          <li><span aria-hidden="true">✅</span> <span>AI SEO Copilot, Artikel SEO, &amp; AI Foto Studio (BYOK)</span></li>
          <li><span aria-hidden="true">✅</span> <span>Cek Ongkir Biteship otomatis + Midtrans/Flip + notifikasi WA/Telegram</span></li>
          <li><span aria-hidden="true">✅</span> <span>Pembukuan Kas, HPP, Laba Rugi, &amp; Proteksi Cloudflare Turnstile SEO-Safe</span></li>
        </ul>
      </div>

      <div class="lm-pricing-note">
        <strong><span aria-hidden="true">📌</span> Ketentuan Custom Domain &amp; Email Brand:</strong> Seluruh paket menggunakan <strong>domain brand milik sendiri</strong> (misal <code>namatoko.com</code> atau <code>.id</code>) dan akun <strong>Email Custom / SMTP</strong> agar 100% aset digital atas nama Anda. Biaya pembelian domain dibayarkan ke registrar oleh pemilik usaha, sedangkan seluruh setting DNS, SSL HTTPS, dan integrasi sistem dibantu oleh tim LarisDari.web.id hingga live.
      </div>
    </div>
  </section>

  <!-- 7. ORDER FORM (#pesan) -->
  <section id="pesan" class="lm-section">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Pendaftaran &amp; Pemesanan Lisensi</span>
        <h2>Mulai Miliki Website Komersial Anda Sekarang</h2>
        <p>Pilih skema kepemilikan dan tier infrastruktur Anda (semua termasuk Custom Domain &amp; Gratis Support Setting). Pesanan Anda langsung tercatat di sistem untuk diproses dan diaktifkan.</p>
      </div>

      <div class="lm-order-form-card">
        <?php if ($lead_submitted) : ?>
          <div class="lm-alert-success" role="status">
            <strong>✅ Form Pemesanan Berhasil Dikirim!</strong>
            <?php if ($lead_order_code !== '') : ?>
              <span> Kode Pesanan: <strong><?php echo esc_html($lead_order_code); ?></strong>.</span>
            <?php endif; ?>
            <p style="margin:6px 0 0;">
              Terima kasih telah mendaftar. Data pemesanan Anda sudah tercatat di sistem dan tim LarisDari.web.id akan segera menindaklanjuti setup website Anda.
            </p>
            <?php if ($lead_billing_url !== '') : ?>
              <p style="margin:10px 0 0;">
                <a href="<?php echo esc_url($lead_billing_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-primary">
                  Buka Portal Billing &amp; Upload Bukti Bayar &rarr;
                </a>
              </p>
            <?php endif; ?>
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
              <label for="lm_license_plan">Skema Kepemilikan Lisensi <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <select id="lm_license_plan" name="license_plan" class="lm-select">
                <option value="OWNED">1. Beli Lisensi di Awal (<?php echo esc_html($price_lifetime); ?>)</option>
                <option value="DEFERRED_6M">2. Mulai Tanpa Lisensi Awal (Wajib tebus maks. Bln ke-6)</option>
              </select>
            </div>

            <div class="lm-field">
              <label for="lm_infra_tier">Infrastruktur Server <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <select id="lm_infra_tier" name="infra_tier" class="lm-select">
                <option value="SHARED">Shared Infrastructure (<?php echo esc_html($price_monthly); ?> / <?php echo esc_html($price_shared_deferred); ?> bln)</option>
                <option value="DEDICATED">Dedicated Infrastructure (<?php echo esc_html($price_dedicated_owned); ?> / <?php echo esc_html($price_dedicated_deferred); ?> bln)</option>
              </select>
            </div>

            <div class="lm-field">
              <label for="lm_full_name">Nama Lengkap <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <input type="text" id="lm_full_name" name="full_name" required autocomplete="name" class="lm-input" placeholder="Contoh: Budi Santoso">
            </div>

            <div class="lm-field">
              <label for="lm_whatsapp">Nomor WhatsApp Aktif <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <input type="tel" id="lm_whatsapp" name="whatsapp" required autocomplete="tel" class="lm-input" placeholder="Masukkan nomor WhatsApp aktif Anda">
            </div>

            <div class="lm-field">
              <label for="lm_brand_name">Nama Brand / Toko <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <input type="text" id="lm_brand_name" name="brand_name" required autocomplete="organization" class="lm-input" placeholder="Contoh: Batik Nusantara Jaya">
            </div>

            <div class="lm-field">
              <label for="lm_email">Alamat Email</label>
              <input type="email" id="lm_email" name="email" autocomplete="email" class="lm-input" placeholder="Contoh: halo@namatoko.com">
            </div>

            <div class="lm-field">
              <label for="lm_custom_domain">Custom Domain Brand Anda <span style="color:#dc2626;" aria-hidden="true">*</span></label>
              <input type="text" id="lm_custom_domain" name="custom_domain" required autocomplete="url" class="lm-input" placeholder="Contoh: namatoko.com (dibantu setting tim kami)">
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

          <div class="lm-calc-summary" aria-live="polite">
            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px;">
              <div>
                <div style="font-size:0.78rem; font-weight:700; color:#4338ca; text-transform:uppercase;">Estimasi Pembayaran Awal</div>
                <div id="lm-calc-monthly" style="font-size:0.88rem; font-weight:700; color:#1e293b;">Rp 150.000 / bulan (Shared)</div>
              </div>
              <div id="lm-calc-initial" style="font-size:1.4rem; font-weight:800; color:#312e81;">Rp 3.150.000</div>
            </div>
            <p id="lm-calc-note" style="margin:6px 0 0; font-size:0.82rem; color:#475569;">
              Lisensi Rp 3.000.000 + operasional bulan ke-1 Rp 150.000. Gratis setting Custom Domain &amp; integrasi penuh.
            </p>
          </div>

          <div class="lm-field" style="margin-top:16px;">
            <label for="lm_notes">Catatan / Kebutuhan Khusus (Opsional)</label>
            <textarea id="lm_notes" name="notes" rows="3" class="lm-textarea" placeholder="Ceritakan jumlah produk, apakah ingin migrasi katalog, atau pertanyaan lainnya..."></textarea>
          </div>

          <div style="margin-top:22px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
            <p style="margin:0; font-size:0.84rem; color:#475569;">
              <span aria-hidden="true">🔒</span> Data Anda aman dan hanya digunakan untuk menindaklanjuti pemesanan website Anda.
            </p>
            <button type="submit" class="lm-btn lm-btn-primary lm-btn-lg">
              Kirim Form Pemesanan Lisensi &rarr;
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>

  <!-- 7B. SEO BLOG & PLAYBOOK CLUSTER -->
  <?php
  $latest_articles = new WP_Query(array(
      'post_type'           => 'post',
      'post_status'         => 'publish',
      'posts_per_page'      => 3,
      'ignore_sticky_posts' => true,
  ));
  if ($latest_articles->have_posts()) : ?>
    <section id="panduan" class="lm-section" style="padding-top:24px;">
      <div class="lm-container">
        <div class="lm-section-header" style="margin-bottom:36px;">
          <span class="lm-eyebrow">Playbook Penjualan &amp; Web Commerce</span>
          <h2>Strategi Terbaru Meningkatkan Penjualan Brand Anda</h2>
          <p>Pelajari cara mengelola omnichannel marketplace, iklan sosial media, harga grosir B2B, dan SEO toko online langsung dari ahlinya.</p>
        </div>

        <div class="lm-article-grid">
          <?php while ($latest_articles->have_posts()) : $latest_articles->the_post(); ?>
            <?php
            $art_id    = get_the_ID();
            $art_cats  = get_the_category($art_id);
            $art_cat   = !empty($art_cats) ? $art_cats[0] : null;
            $art_thumb = get_the_post_thumbnail_url($art_id, 'medium_large');
            $art_alt   = (string) get_post_meta(get_post_thumbnail_id($art_id), '_wp_attachment_image_alt', true);
            if (trim($art_alt) === '') {
                $art_alt = get_the_title();
            }
            $art_mins  = larisdari_web_reading_time(get_post_field('post_content', $art_id));
            ?>
            <article class="lm-article-card">
              <a href="<?php the_permalink(); ?>" class="lm-article-thumb-wrap" tabindex="-1" aria-hidden="true">
                <?php if ($art_thumb) : ?>
                  <img src="<?php echo esc_url($art_thumb); ?>" alt="<?php echo esc_attr($art_alt); ?>" width="1200" height="675" class="lm-article-thumb" loading="lazy" decoding="async">
                <?php endif; ?>
              </a>
              <div class="lm-article-card-body">
                <?php if ($art_cat) : ?>
                  <span class="lm-cat-badge is-small"><?php echo esc_html($art_cat->name); ?></span>
                <?php endif; ?>
                <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_excerpt()), 20, '...')); ?></p>
                <div class="lm-article-card-foot">
                  <span><?php echo esc_html((string) $art_mins); ?> menit baca</span>
                  <a href="<?php the_permalink(); ?>" class="lm-read-more">Baca Panduan &rarr;</a>
                </div>
              </div>
            </article>
          <?php endwhile; wp_reset_postdata(); ?>
        </div>

        <div style="text-align:center; margin-top:32px;">
          <a href="<?php echo esc_url(home_url('/artikel/')); ?>" class="lm-btn lm-btn-outline lm-btn-lg">
            Lihat Seluruh 10 Panduan Strategi &rarr;
          </a>
        </div>
      </div>
    </section>
  <?php endif; ?>

  <!-- 8. FAQ & FINAL CTA -->
  <section id="faq" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Pertanyaan Umum</span>
        <h2>Yang Sering Ditanyakan Sebelum Memulai</h2>
      </div>

      <div class="lm-faq-list">
        <details class="lm-faq-item" open>
          <summary>Bagaimana skema harga lisensi <?php echo esc_html($price_lifetime); ?>, opsi Shared vs Dedicated, dan Mulai Tanpa Lisensi Awal?</summary>
          <p class="lm-faq-answer">
            Semua paket sudah memakai <strong>Custom Domain brand Anda</strong> dan <strong>GRATIS Support Setting</strong> oleh tim kami. Bila memilih <strong>Beli Lisensi di Awal (<?php echo esc_html($price_lifetime); ?>)</strong>, biaya bulanannya adalah <strong><?php echo esc_html($price_monthly); ?>/bln (Shared)</strong> atau <strong><?php echo esc_html($price_dedicated_owned); ?>/bln (Dedicated)</strong>. Jika memilih <strong>Tanpa Lisensi Awal</strong>, Anda mulai dari <strong><?php echo esc_html($price_shared_deferred); ?>/bln (Shared)</strong> atau <strong><?php echo esc_html($price_dedicated_deferred); ?>/bln (Dedicated)</strong> dan wajib menebus lisensi <?php echo esc_html($price_lifetime); ?> maksimal di bulan ke-6 (setelah ditebus tarif turun ke harga normal; jika melewati bulan ke-6 belum ditebus, layanan otomatis dinonaktifkan).
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
            Tidak. Implementasi Cloudflare Turnstile di toko kami dirancang ramah SEO: pemuatannya ditunda setelah tampilan utama (<em>first impression</em>) selesai dimuat dan otomatis dilewati bagi crawler mesin pencari seperti Googlebot sehingga skor Core Web Vitals dan indeksasi tetap optimal.
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
