<?php
/**
 * Main Landing Page Template for larismanis.online
 *
 * @package larismanis-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$badge_text     = larismanis_get_option('larismanis_badge_text', 'Platform Webcommerce Omnichannel #1 untuk Brand & UMKM Indonesia');
$hero_title     = larismanis_get_option('larismanis_hero_title', 'Website komersial pemersatu jalur penjualan online Anda');
$hero_subtitle  = larismanis_get_option('larismanis_hero_subtitle', 'Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir otomatis Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu toko online milik Anda sendiri.');
$demo_url       = larismanis_get_option('larismanis_demo_url', 'https://demo.larismanis.online');
$demo_admin_url = larismanis_get_option('larismanis_demo_admin_url', 'https://demo.larismanis.online/login');

$price_starter    = larismanis_get_option('larismanis_price_starter', 'Rp 149.000');
$price_growth     = larismanis_get_option('larismanis_price_growth', 'Rp 299.000');
$price_enterprise = larismanis_get_option('larismanis_price_enterprise', 'Custom');

$wa_starter    = larismanis_whatsapp_url('Halo Tim LarisManis.online, saya tertarik berlangganan Paket Starter UMKM (' . $price_starter . '/bln).');
$wa_growth     = larismanis_whatsapp_url('Halo Tim LarisManis.online, saya tertarik berlangganan Paket Growth Omnichannel & AI (' . $price_growth . '/bln).');
$wa_enterprise = larismanis_whatsapp_url('Halo Tim LarisManis.online, saya ingin konsultasi Paket Enterprise / Custom Brand.');
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
          <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-primary lm-btn-lg">
            <span>Coba Live Storefront Demo</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
          <a href="<?php echo esc_url($demo_admin_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline lm-btn-lg">
            <span>Coba Panel Admin Demo</span>
          </a>
        </div>

        <div class="lm-usp-row">
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> Domain &amp; Database Mandiri</span>
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> Terintegrasi Marketplace &amp; Biteship</span>
          <span class="lm-usp-item"><span class="lm-usp-check">✓</span> AI SEO &amp; Foto Studio Produk</span>
        </div>
      </div>

      <!-- Visual Interactive Commerce Card -->
      <div class="lm-mockup-card" aria-label="Pratinjau Ekosistem Toko LarisManis.online">
        <div class="lm-mockup-topbar">
          <div class="lm-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="lm-mockup-url">https://demo.larismanis.online</div>
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
        <span class="lm-eco-badge">🔵 Blibli &amp; Lazada</span>
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
        <span class="lm-eyebrow">Mengapa LarisManis.online?</span>
        <h2>Jangan Taruh Masa Depan Brand Anda di Tangan Algoritma Orang Lain</h2>
        <p>Marketplace tetap penting untuk mendatangkan trafik awal, namun brand yang bertumbuh selalu memiliki website komersial sebagai rumah pusatnya.</p>
      </div>

      <div class="lm-compare-grid">
        <div class="lm-compare-card">
          <h3><span>⚠️</span> Hanya Bergantung pada Marketplace</h3>
          <ul class="lm-check-list">
            <li><span>❌</span> Biaya administrasi &amp; potongan komisi terus naik menekan margin keuntungan.</li>
            <li><span>❌</span> Perang harga terbuka di halaman hasil pencarian memaksa diskon berlebih.</li>
            <li><span>❌</span> Data kontak &amp; riwayat belanja pelanggan tidak dimiliki penuh oleh penjual.</li>
            <li><span>❌</span> Sulit menerapkan skema harga grosir bertingkat per varian sekaligus menerima pre-order rapi.</li>
            <li><span>❌</span> Traffic iklan (Meta/TikTok Ads) yang dikirim keluar langsung terpapar produk kompetitor.</li>
          </ul>
        </div>

        <div class="lm-compare-card is-winner">
          <h3><span>🚀</span> Website Komersial LarisManis.online</h3>
          <ul class="lm-check-list">
            <li><span>✅</span> <strong>Satukan Seluruh Kanal:</strong> Pembeli bisa checkout langsung di web atau klik tombol resmi ke Shopee/Tokopedia/TikTok Shop Anda.</li>
            <li><span>✅</span> <strong>SEO Organik Google 24 Jam:</strong> Artikel panduan otomatis terhubung ke kartu produk katalog Anda untuk mendatangkan pembeli organik.</li>
            <li><span>✅</span> <strong>Data &amp; Domain Milik Sendiri:</strong> Bebas atur warna brand, tipografi, pixel pelacakan (Meta, Google GA4, TikTok), dan banner slider.</li>
            <li><span>✅</span> <strong>Grosir &amp; Retensi Lebih Tinggi:</strong> Matriks harga bertingkat per kuantitas dan landing page kampanye iklan terfokus konversi.</li>
            <li><span>✅</span> <strong>Asisten AI &amp; Pembukuan Terpadu:</strong> Dari pembuatan foto produk studio, SEO artikel, hingga jurnal kas &amp; laba rugi dalam satu panel.</li>
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
          <p>Kelola produk fisik, digital, maupun layanan Pre-Order. Setiap halaman produk dapat menampilkan tombol checkout langsung sekaligus tautan Shopee, Tokopedia, TikTok Shop, Blibli, dan Lazada.</p>
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
            Rasakan Sendiri Pengalaman Storefront &amp; Panel Admin LarisManis.online
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

  <!-- 6. PRICING TIERS -->
  <section id="harga" class="lm-section lm-section-alt">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Investasi Terukur</span>
        <h2>Pilih Paket Website Komersial Sesuai Skala Bisnis Anda</h2>
        <p>Semua paket sudah termasuk setup awal, domain &amp; SSL Cloudflare, panduan lengkap, serta dukungan teknis langsung di Indonesia.</p>
      </div>

      <div class="lm-pricing-grid">
        <!-- Starter -->
        <div class="lm-price-card">
          <div>
            <h3 class="lm-price-title">Starter UMKM</h3>
            <p class="lm-price-desc">Untuk toko yang ingin punya website brand sendiri &amp; link marketplace terpusat.</p>
            <div style="margin-bottom:20px;">
              <span class="lm-price-amount"><?php echo esc_html($price_starter); ?></span>
              <span class="lm-price-period"> / bulan</span>
            </div>
            <ul class="lm-check-list">
              <li><span>✅</span> Website toko mandiri + subdomain/custom domain</li>
              <li><span>✅</span> Katalog produk, kategori, &amp; varian tanpa batas</li>
              <li><span>✅</span> Integrasi tombol Shopee, Tokopedia, TikTok Shop</li>
              <li><span>✅</span> Ongkir flat dalam/luar kota &amp; Biteship API</li>
              <li><span>✅</span> Proteksi anti-bot Cloudflare Turnstile</li>
            </ul>
          </div>
          <a href="<?php echo esc_url($wa_starter); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-outline" style="width:100%;">
            Pilih Paket Starter &rarr;
          </a>
        </div>

        <!-- Growth (Popular) -->
        <div class="lm-price-card is-featured">
          <span class="lm-popular-pill">Paling Populer</span>
          <div>
            <h3 class="lm-price-title">Growth Omnichannel &amp; AI</h3>
            <p class="lm-price-desc">Untuk bisnis bertumbuh yang memaksimalkan SEO, grosir B2B, dan otomatisasi AI.</p>
            <div style="margin-bottom:20px;">
              <span class="lm-price-amount"><?php echo esc_html($price_growth); ?></span>
              <span class="lm-price-period"> / bulan</span>
            </div>
            <ul class="lm-check-list">
              <li><span>✅</span> Seluruh fitur <strong>Starter UMKM</strong></li>
              <li><span>✅</span> Matriks Harga Grosir Bertingkat (Batch Pricing)</li>
              <li><span>✅</span> AI SEO Copilot &amp; AI Product Image Studio (BYOK)</li>
              <li><span>✅</span> Builder Artikel SEO &amp; Commercial Landing Page</li>
              <li><span>✅</span> Pembayaran Midtrans/Flip + Notifikasi Telegram &amp; WA</li>
              <li><span>✅</span> Laporan Pembukuan Kas, HPP, &amp; Laba Rugi</li>
            </ul>
          </div>
          <a href="<?php echo esc_url($wa_growth); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-primary" style="width:100%;">
            Mulai Dengan Paket Growth &rarr;
          </a>
        </div>

        <!-- Enterprise -->
        <div class="lm-price-card">
          <div>
            <h3 class="lm-price-title">Enterprise / Custom Brand</h3>
            <p class="lm-price-desc">Untuk distributor besar, waralaba, atau agensi dengan kebutuhan integrasi khusus.</p>
            <div style="margin-bottom:20px;">
              <span class="lm-price-amount"><?php echo esc_html($price_enterprise); ?></span>
              <span class="lm-price-period"> sesuai kebutuhan</span>
            </div>
            <ul class="lm-check-list">
              <li><span>✅</span> Seluruh fitur <strong>Growth Omnichannel &amp; AI</strong></li>
              <li><span>✅</span> Migrasi penuh ribuan SKU produk &amp; artikel lama</li>
              <li><span>✅</span> Dukungan dedicated server &amp; SLA prioritas</li>
              <li><span>✅</span> Penyesuaian alur kerja B2B &amp; webhook ERP khusus</li>
              <li><span>✅</span> Sesi pelatihan tim admin &amp; staf gudang</li>
            </ul>
          </div>
          <a href="<?php echo esc_url($wa_enterprise); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-emerald" style="width:100%;">
            Hubungi Tim Enterprise &rarr;
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- 7. FAQ & FINAL CTA -->
  <section id="faq" class="lm-section">
    <div class="lm-container">
      <div class="lm-section-header">
        <span class="lm-eyebrow">Pertanyaan Umum</span>
        <h2>Yang Sering Ditanyakan Sebelum Memulai</h2>
      </div>

      <div class="lm-faq-list">
        <details class="lm-faq-item" open>
          <summary>Apakah toko bisa memakai nama domain brand sendiri (misalnya namatoko.com atau .id)?</summary>
          <p class="lm-faq-answer">
            Ya, tentu. Sistem mendukung arsitektur multi-tenant domain kustom penuh. Pengunjung yang mengakses domain toko Anda langsung melihat identitas, warna brand, logo, katalog, serta informasi toko milik Anda sendiri.
          </p>
        </details>

        <details class="lm-faq-item">
          <summary>Apakah pembeli di website tetap bisa diarahkan belanja ke Shopee, Tokopedia, atau TikTok Shop kami?</summary>
          <p class="lm-faq-answer">
            Bisa. Di setiap produk, Anda dapat mengisi URL Shopee, Tokopedia, TikTok Shop, Blibli, dan satu marketplace kustom (misalnya Lazada). Dengan begitu pembeli bebas memilih checkout langsung di website atau lewat marketplace kepercayaan mereka.
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
