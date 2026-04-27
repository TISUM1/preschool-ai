/* ============================================
   App — Main Module, Event Bus, Global Helpers
   幼师AI助手
   ============================================ */

var App = {

  init: async function() {
    // Init settings
    await AppSettings.init();

    // Apply theme
    var theme = AppSettings.getTheme();
    document.documentElement.setAttribute('data-theme', theme);

    // Init voice input
    VoiceInput.init();
    this._bindGlobalVoice();

    // Init router
    Router.init();
    this._bindNavEvents();
    this._bindPageEvents();

    // PWA install
    this._handlePWABanner();

    console.log('幼师AI助手 initialized');
  },

  // --- Navigation ---
  _bindNavEvents: function() {
    var self = this;
    document.getElementById('bottom-nav').addEventListener('click', function(e) {
      var btn = e.target.closest('.nav-item');
      if (!btn) return;
      var page = btn.dataset.page;
      if (page) Router.navigate(page);
    });

    // Update nav highlight on route change
    window.addEventListener('hashchange', function() {
      var page = Router.currentPage;
      document.querySelectorAll('.nav-item').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    });
  },

  _bindPageEvents: function() {
    var self = this;

    // Listen for page-loaded events to run page-specific init
    document.addEventListener('page-loaded', function(e) {
      var page = e.detail.page;

      // Show/hide bottom nav
      var navPages = ['home', 'library', 'documents', 'settings'];
      var nav = document.getElementById('bottom-nav');
      var fab = document.getElementById('global-voice-btn');
      if (nav) {
        nav.style.display = navPages.includes(page) ? 'flex' : 'none';
        // Hide FAB on pages with navigation
        if (fab) fab.style.display = navPages.includes(page) ? 'block' : 'none';
      }
    });
  },

  // --- Global Voice Button ---
  _bindGlobalVoice: function() {
    var self = this;
    var btn = document.getElementById('global-voice-btn');
    if (!btn) return;

    // Long press to record
    var pressTimer;

    btn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      pressTimer = setTimeout(function() {
        var activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          VoiceInput.start(activeEl.id || activeEl.name);
          btn.classList.add('recording');
        }
      }, 300);
    });

    btn.addEventListener('touchend', function() {
      clearTimeout(pressTimer);
      VoiceInput.stop();
      btn.classList.remove('recording');
    });

    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      pressTimer = setTimeout(function() {
        var activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          VoiceInput.start(activeEl.id || activeEl.name);
          btn.classList.add('recording');
        }
      }, 300);
    });

    btn.addEventListener('mouseup', function() {
      clearTimeout(pressTimer);
      VoiceInput.stop();
      btn.classList.remove('recording');
    });

    // Update voice button status
    VoiceInput.onStatusChange = function(status) {
      if (status === 'idle') {
        btn.classList.remove('recording');
      }
    };
  },

  // --- Loading ---
  showLoading: function(msg) {
    var overlay = document.getElementById('loading-overlay');
    var text = document.getElementById('loading-text');
    if (overlay) overlay.classList.remove('hidden');
    if (text) text.textContent = msg || '加载中...';
  },

  hideLoading: function() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  // --- PWA Install ---
  _deferredPrompt: null,

  _handlePWABanner: function() {
    var self = this;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      self._deferredPrompt = e;
      var banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    var installBtn = document.getElementById('install-btn');
    var dismissBtn = document.getElementById('dismiss-btn');

    if (installBtn) {
      installBtn.addEventListener('click', function() {
        if (self._deferredPrompt) {
          self._deferredPrompt.prompt();
          self._deferredPrompt.userChoice.then(function(result) {
            self._deferredPrompt = null;
          });
        }
        var banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        var banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    // Hide if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      var banner = document.getElementById('install-banner');
      if (banner) banner.classList.add('hidden');
    }
  },

  // --- Utilities ---
  escapeHtml: function(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Simple markdown-to-HTML for display
   */
  markdownToHtml: function(text) {
    if (!text) return '';

    var html = text;
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists (simple)
    html = html.replace(/^(\d+)[\.、] (.+)$/gm, '<li>$2</li>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return '<p>' + html + '</p>';
  },

  /**
   * Get today's date string for greeting
   */
  getDateString: function() {
    var now = new Date();
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    var w = weekdays[now.getDay()];

    var greetings = [];
    var hour = now.getHours();
    if (hour < 9) greetings.push('早上好');
    else if (hour < 12) greetings.push('上午好');
    else if (hour < 18) greetings.push('下午好');
    else greetings.push('晚上好');

    var blessings = ['祝您有一个好心情 ☀️', '愿今天工作顺利 🌸', '美好的一天从此刻开始 ✨', '记得喝杯水休息一下 🍵'];
    var blessing = blessings[Math.floor(Math.random() * blessings.length)];

    return {
      greeting: greetings[0],
      dateStr: y + '年' + m + '月' + d + '日 星期' + w,
      blessing: blessing
    };
  }
};

// --- Toast Helper ---
var Toast = {
  show: function(msg, type, duration) {
    duration = duration || 3000;
    var container = document.getElementById('toast-container');
    if (!container) return;

    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    container.appendChild(el);

    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration);
  }
};

// --- Boot on DOM ready ---
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
