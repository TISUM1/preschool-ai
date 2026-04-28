/* ============================================
   Hash Router
   ============================================ */

const Router = {
  currentPage: null,
  currentParams: {},

  init() {
    window.addEventListener('hashchange', () => this.load());
    this.load();
  },

  navigate(page, params) {
    let hash = '#' + page;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) hash += '?' + qs;
    }
    window.location.hash = hash;
  },

  load() {
    const hash = window.location.hash.slice(1) || 'home';
    const [page, query] = hash.split('?');
    this.currentParams = {};
    if (query) {
      new URLSearchParams(query).forEach((v, k) => { this.currentParams[k] = v; });
    }
    this.currentPage = page;
    this.renderPage(page);
    this.highlightNav(page);
  },

  async renderPage(page) {
    const container = document.getElementById('page-content');
    const validPages = ['home', 'library', 'templates', 'generate', 'documents', 'settings', 'classes'];

    if (!container) return;
    container.style.opacity = '0';

    // Lazy-load page HTML or render inline
    let html = '';
    try {
      const resp = await fetch(`pages/${page}.html`);
      if (resp.ok) html = await resp.text();
    } catch (e) {
      html = `<div class="page-error"><p>页面加载失败</p></div>`;
    }

    container.innerHTML = html;

    // Execute inline scripts: innerHTML doesn't run <script> tags.
    // Collect all inline scripts, remove originals, then append to body.
    var oldScripts = container.querySelectorAll('script');
    var codeList = [];
    oldScripts.forEach(function(s) {
      if (!s.src) codeList.push(s.textContent);
      s.parentNode.removeChild(s);
    });
    codeList.forEach(function(code) {
      var s = document.createElement('script');
      s.textContent = code;
      container.appendChild(s);
    });

    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transition = 'opacity 0.2s ease';
    });

    // Dispatch custom event for page-specific init
    document.dispatchEvent(new CustomEvent('page-loaded', { detail: { page, params: this.currentParams } }));
  },

  highlightNav(page) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
  }
};
