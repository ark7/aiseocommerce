<?php
/**
 * Single SEO Article Template (StoryBrand Editorial Layout)
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

$demo_url     = larisdari_web_get_option('larisdari_web_demo_url', 'https://demo.larisdari.web.id');
$artikel_url  = home_url('/artikel/');
$pricing_url  = home_url('/#harga');
$order_url    = home_url('/#pesan');
?>

<main id="primary" class="lm-section" style="padding-top:36px;">
  <div class="lm-container">
    <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
      <?php
      $post_id      = get_the_ID();
      $categories   = get_the_category($post_id);
      $primary_cat  = !empty($categories) ? $categories[0] : null;
      $read_minutes = larisdari_web_reading_time(get_post_field('post_content', $post_id));
      $thumb_id     = get_post_thumbnail_id($post_id);
      $thumb_url    = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'full') : '';
      $thumb_alt    = $thumb_id ? (string) get_post_meta($thumb_id, '_wp_attachment_image_alt', true) : '';
      if (trim($thumb_alt) === '') {
          $thumb_alt = get_the_title();
      }
      ?>

      <div class="lm-article-shell">
        <nav class="lm-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="<?php echo esc_url(home_url('/')); ?>">Beranda</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="<?php echo esc_url($artikel_url); ?>">Artikel</a></li>
            <?php if ($primary_cat) : ?>
              <li aria-hidden="true">/</li>
              <li><a href="<?php echo esc_url(get_category_link($primary_cat->term_id)); ?>"><?php echo esc_html($primary_cat->name); ?></a></li>
            <?php endif; ?>
            <li aria-hidden="true">/</li>
            <li aria-current="page"><span><?php the_title(); ?></span></li>
          </ol>
        </nav>

        <article <?php post_class(); ?>>
          <header class="lm-article-header">
            <?php if ($primary_cat) : ?>
              <a href="<?php echo esc_url(get_category_link($primary_cat->term_id)); ?>" class="lm-cat-badge">
                <?php echo esc_html($primary_cat->name); ?>
              </a>
            <?php endif; ?>

            <h1><?php the_title(); ?></h1>

            <div class="lm-article-meta">
              <span><span aria-hidden="true">📅</span> <?php echo esc_html(get_the_date('d F Y')); ?></span>
              <span aria-hidden="true">•</span>
              <span><span aria-hidden="true">⏱️</span> Estimasi baca <?php echo esc_html((string) $read_minutes); ?> menit</span>
              <span aria-hidden="true">•</span>
              <span>Oleh Tim Strategi LarisDari.web.id</span>
            </div>
          </header>

          <?php if ($thumb_url) : ?>
            <figure class="lm-article-hero-figure">
              <img
                src="<?php echo esc_url($thumb_url); ?>"
                alt="<?php echo esc_attr($thumb_alt); ?>"
                width="1200"
                height="675"
                class="lm-article-hero-img"
                fetchpriority="high"
                decoding="async"
              >
            </figure>
          <?php endif; ?>

          <div class="lm-article-body">
            <?php the_content(); ?>
          </div>

          <aside class="lm-article-cta-box" aria-label="Langkah Selanjutnya Membangun Website Komersial">
            <span class="lm-eyebrow" style="color:#a5b4fc;">Pemandu Pertumbuhan Brand Anda</span>
            <h2>Siap Mengubah Pengunjung Sosial Media &amp; Google Menjadi Pembeli di Rumah Brand Sendiri?</h2>
            <p>
              Anda tidak perlu membangun sistem dari nol. <strong>LarisDari.web.id</strong> hadir sebagai partner teknis Anda — menyatukan katalog mandiri, Shopee, Tokopedia, TikTok Shop, cek ongkir otomatis Biteship, payment gateway, harga grosir bertingkat, dan AI SEO dalam satu website komersial milik Anda sendiri.
            </p>
            <div class="lm-article-cta-actions">
              <a href="<?php echo esc_url($order_url); ?>" class="lm-btn lm-btn-primary lm-btn-lg">
                Pesan Website Sekarang &rarr;
              </a>
              <a href="<?php echo esc_url($pricing_url); ?>" class="lm-btn lm-btn-outline lm-btn-lg">
                Lihat Skema Harga
              </a>
              <a href="<?php echo esc_url($demo_url); ?>" target="_blank" rel="noopener" class="lm-btn lm-btn-emerald lm-btn-lg">
                Coba Demo Live Toko
              </a>
            </div>
          </aside>
        </article>
      </div>

      <?php
      $related_args = array(
          'post_type'           => 'post',
          'post_status'         => 'publish',
          'posts_per_page'      => 3,
          'post__not_in'        => array($post_id),
          'ignore_sticky_posts' => true,
      );
      if ($primary_cat) {
          $related_args['cat'] = $primary_cat->term_id;
      }
      $related_query = new WP_Query($related_args);
      if (!$related_query->have_posts()) {
          unset($related_args['cat']);
          $related_query = new WP_Query($related_args);
      }
      ?>

      <?php if ($related_query->have_posts()) : ?>
        <section class="lm-related-section" aria-labelledby="related-heading">
          <div class="lm-related-header">
            <h2 id="related-heading">Strategi &amp; Panduan Lanjutan untuk Brand Anda</h2>
            <a href="<?php echo esc_url($artikel_url); ?>" class="lm-related-all-link">Semua Artikel &rarr;</a>
          </div>
          <div class="lm-article-grid">
            <?php while ($related_query->have_posts()) : $related_query->the_post(); ?>
              <?php
              $rel_id    = get_the_ID();
              $rel_cats  = get_the_category($rel_id);
              $rel_cat   = !empty($rel_cats) ? $rel_cats[0] : null;
              $rel_thumb = get_the_post_thumbnail_url($rel_id, 'medium_large');
              $rel_alt   = (string) get_post_meta(get_post_thumbnail_id($rel_id), '_wp_attachment_image_alt', true);
              if (trim($rel_alt) === '') {
                  $rel_alt = get_the_title();
              }
              $rel_mins  = larisdari_web_reading_time(get_post_field('post_content', $rel_id));
              ?>
              <article class="lm-article-card">
                <a href="<?php the_permalink(); ?>" class="lm-article-thumb-wrap" tabindex="-1" aria-hidden="true">
                  <?php if ($rel_thumb) : ?>
                    <img src="<?php echo esc_url($rel_thumb); ?>" alt="<?php echo esc_attr($rel_alt); ?>" width="1200" height="675" class="lm-article-thumb" loading="lazy" decoding="async">
                  <?php endif; ?>
                </a>
                <div class="lm-article-card-body">
                  <?php if ($rel_cat) : ?>
                    <span class="lm-cat-badge is-small"><?php echo esc_html($rel_cat->name); ?></span>
                  <?php endif; ?>
                  <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                  <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_excerpt()), 20, '...')); ?></p>
                  <div class="lm-article-card-foot">
                    <span><?php echo esc_html((string) $rel_mins); ?> menit baca</span>
                    <a href="<?php the_permalink(); ?>" class="lm-read-more">Baca Panduan &rarr;</a>
                  </div>
                </div>
              </article>
            <?php endwhile; wp_reset_postdata(); ?>
          </div>
        </section>
      <?php endif; ?>

    <?php endwhile; endif; ?>
  </div>
</main>

<?php
get_footer();
