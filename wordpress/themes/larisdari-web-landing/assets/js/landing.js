(function () {
  var toggleBtn = document.getElementById('lm-mobile-toggle');
  var drawer = document.getElementById('lm-mobile-drawer');
  var icon = document.getElementById('lm-toggle-icon');

  if (toggleBtn && drawer) {
    var setDrawerOpen = function (open) {
      if (open) {
        drawer.removeAttribute('hidden');
        drawer.classList.add('is-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (icon) icon.textContent = '✕';
      } else {
        drawer.classList.remove('is-open');
        drawer.setAttribute('hidden', '');
        toggleBtn.setAttribute('aria-expanded', 'false');
        if (icon) icon.textContent = '☰';
      }
    };

    toggleBtn.addEventListener('click', function () {
      var isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
      setDrawerOpen(!isOpen);
    });

    var mobileLinks = drawer.querySelectorAll('a');
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawerOpen(false);
      });
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    });
  }

  // Capture UTM campaign parameters into the #pesan order form
  try {
    var params = new URLSearchParams(window.location.search || '');
    var utmSource = document.getElementById('lm-utm-source');
    var utmMedium = document.getElementById('lm-utm-medium');
    var utmCampaign = document.getElementById('lm-utm-campaign');
    if (utmSource && params.get('utm_source')) utmSource.value = params.get('utm_source');
    if (utmMedium && params.get('utm_medium')) utmMedium.value = params.get('utm_medium');
    if (utmCampaign && params.get('utm_campaign')) utmCampaign.value = params.get('utm_campaign');
  } catch (err) {
    // Ignore unsupported browser URLSearchParams issues
  }

  // Interactive 2x2 pricing plan & infra tier calculator inside #pesan
  var planSelect = document.getElementById('lm_license_plan');
  var tierSelect = document.getElementById('lm_infra_tier');
  var summaryTotalEl = document.getElementById('lm-calc-initial');
  var summaryMonthlyEl = document.getElementById('lm-calc-monthly');
  var summaryNoteEl = document.getElementById('lm-calc-note');

  var updatePricingCalculator = function () {
    if (!planSelect || !tierSelect || !summaryTotalEl || !summaryMonthlyEl || !summaryNoteEl) {
      return;
    }
    var plan = planSelect.value === 'DEFERRED_6M' ? 'DEFERRED_6M' : 'OWNED';
    var tier = tierSelect.value === 'DEDICATED' ? 'DEDICATED' : 'SHARED';

    if (plan === 'OWNED') {
      if (tier === 'DEDICATED') {
        summaryTotalEl.textContent = 'Rp 3.350.000';
        summaryMonthlyEl.textContent = 'Rp 350.000 / bulan (Dedicated)';
        summaryNoteEl.textContent = 'Lisensi Rp 3.000.000 + operasional bulan ke-1 Rp 350.000. Gratis setting Custom Domain & integrasi penuh.';
      } else {
        summaryTotalEl.textContent = 'Rp 3.150.000';
        summaryMonthlyEl.textContent = 'Rp 150.000 / bulan (Shared)';
        summaryNoteEl.textContent = 'Lisensi Rp 3.000.000 + operasional bulan ke-1 Rp 150.000. Gratis setting Custom Domain & integrasi penuh.';
      }
    } else {
      if (tier === 'DEDICATED') {
        summaryTotalEl.textContent = 'Rp 450.000';
        summaryMonthlyEl.textContent = 'Rp 450.000 / bulan (turun ke Rp 350.000/bln setelah tebus)';
        summaryNoteEl.textContent = 'Gratis setting Custom Domain. Wajib tebus lisensi Rp 3.000.000 maks. bulan ke-6 (jika lewat, layanan otomatis nonaktif).';
      } else {
        summaryTotalEl.textContent = 'Rp 200.000';
        summaryMonthlyEl.textContent = 'Rp 200.000 / bulan (turun ke Rp 150.000/bln setelah tebus)';
        summaryNoteEl.textContent = 'Gratis setting Custom Domain. Wajib tebus lisensi Rp 3.000.000 maks. bulan ke-6 (jika lewat, layanan otomatis nonaktif).';
      }
    }
  };

  if (planSelect && tierSelect) {
    planSelect.addEventListener('change', updatePricingCalculator);
    tierSelect.addEventListener('change', updatePricingCalculator);
    updatePricingCalculator();
  }

  var selectButtons = document.querySelectorAll('[data-select-plan]');
  selectButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetPlan = btn.getAttribute('data-select-plan');
      var targetTier = btn.getAttribute('data-select-tier');
      if (planSelect && targetPlan) planSelect.value = targetPlan;
      if (tierSelect && targetTier) tierSelect.value = targetTier;
      updatePricingCalculator();
    });
  });
})();
