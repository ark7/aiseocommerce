(function () {
  var toggleBtn = document.getElementById('lm-mobile-toggle');
  var drawer = document.getElementById('lm-mobile-drawer');
  var icon = document.getElementById('lm-toggle-icon');

  if (!toggleBtn || !drawer) return;

  function setDrawerOpen(open) {
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
  }

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
})();
