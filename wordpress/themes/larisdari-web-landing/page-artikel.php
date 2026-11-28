<?php
/**
 * Template Name: Daftar Artikel SEO
 * Blog & SEO Resource Hub at /artikel/
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$artikel_url = home_url('/artikel/');
$categories  = get_categories(array('hide_empty' => true));
$articles_q  = new WP_Query(array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 24,
    'orderby'        => 'date',
    'order'          => 'DESC',
));
?>

<main id="primary" class="lm-section" style="padding-top:42px;">
  <div class="lm-container">
    <nav class="lm-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="<?php echo esc_url(home_url('/')); ?>">Beranda</a></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page"><span>Artikel &amp; Panduan SEO</span></li>
      </ol>
    </nav>

    <div class="lm-section-header" style="margin-bottom:32px;">
      <span class="lm-eyebrow">Playbook Bisnis &amp; Pemasaran Digital</span>
      <h1>Panduan Strategi Web Commerce, Omnichannel, &amp; Sosial Media</h1>
      <p>Kumpulan strategi praktis berbasis <em>Brand Story</em> bagi pemilik brand dan UMKM Indonesia untuk mengubah penonton sosial media &amp; pencari Google menjadi pelanggan setia di website Anda sendiri.</p>
    </div>

    <?php if (!empty($categories)) : ?>
      <nav class="lm-cat-pills" aria-label="Filter Kategori Artikel">
        <a href="<?php echo esc_url($artikel_url); ?>" class="lm-cat-pill is-active">Semua Panduan</a>
        <?php foreach ($categories as $cat) : ?>
          <a href="<?php echo esc_url(get_category_link($cat->term_id)); ?>" class="lm-cat-pill">
            <?php echo esc_html($cat->name); ?> (<?php echo esc_html((string) $cat->count); ?>)
          </a>
        <?php endforeach; ?>
      </nav>
    <?php endif; ?>

    <?php if ($articles_q->have_posts()) : ?>
      <div class="lm-article-grid">
        <?php while ($articles_q->have_posts()) : $articles_q->the_post(); ?>
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
              <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
              <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_excerpt()), 22, '...')); ?></p>
              <div class="lm-article-card-foot">
                <span><?php echo esc_html(get_the_date('d M Y')); ?> • <?php echo esc_html((string) $art_mins); ?> menit</span>
                <a href="<?php the_permalink(); ?>" class="lm-read-more">Baca &rarr;</a>
              </div>
            </div>
          </article>
        <?php endwhile; wp_reset_postdata(); ?>
      </div>
    <?php else : ?>
      <div class="lm-post-card" style="text-align:center;">
        <h2>Artikel Segera Hadir</h2>
        <p>Panduan strategi penjualan online sedang disiapkan. Silakan kembali ke <a href="<?php echo esc_url(home_url('/')); ?>" style="color:#4f46e5; font-weight:700; text-decoration:underline;">beranda LarisDari.web.id</a>.</p>
      </div>
    <?php endif; ?>

    <aside class="lm-article-cta-box" style="margin-top:52px;" aria-label="Pesan Website Komersial">
      <span class="lm-eyebrow" style="color:#a5b4fc;">Siap Eksekusi?</span>
      <h2>Miliki Website Toko Online Omnichannel Milik Brand Anda Sendiri</h2>
      <p>Satukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, kurir nasional Biteship, payment gateway, harga grosir bertingkat, dan asisten AI SEO dalam satu ekosistem kendali penuh.</p>
      <div class="lm-article-cta-actions">
        <a href="<?php echo esc_url(home_url('/#pesan')); ?>" class="lm-btn lm-btn-primary lm-btn-lg">Pesan Sekarang &rarr;</a>
        <a href="<?php echo esc_url(larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id')); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-emerald lm-btn-lg">Coba Demo Live</a>
      </div>
    </aside>
  </div>
</main>

<?php
get_footer();
