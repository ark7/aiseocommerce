<?php
/**
 * Main Index Fallback Template
 * Ensures homepage always renders our custom landing page if reading settings point to latest posts,
 * and renders clean article cards for blog/archive queries.
 *
 * @package larisdari-web-landing
 */

if (!defined('ABSPATH')) {
    exit;
}

if (is_front_page() || is_home()) {
    require get_template_directory() . '/front-page.php';
    return;
}

get_header();
?>

<main class="lm-container lm-article-wrap">
  <?php if (have_posts()) : ?>
    <?php while (have_posts()) : the_post(); ?>
      <article <?php post_class('lm-post-card'); ?>>
        <h1 style="margin-top:0;"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1>
        <div style="font-size:0.85rem; color:#64748b; margin-bottom:14px;">
          Dipublikasikan pada <?php echo esc_html(get_the_date()); ?>
        </div>
        <div><?php the_content(); ?></div>
      </article>
    <?php endwhile; ?>
  <?php else : ?>
    <div class="lm-post-card">
      <h1 style="margin-top:0;">Halaman Tidak Ditemukan</h1>
      <p>Silakan kembali ke <a href="<?php echo esc_url(home_url('/')); ?>" style="color:#4f46e5; font-weight:700;">beranda LarisDari.web.id</a>.</p>
    </div>
  <?php endif; ?>
</main>

<?php
get_footer();
