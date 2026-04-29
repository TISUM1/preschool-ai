/* ============================================
   Settings Manager — 幼师AI助手
   ============================================ */

var AppSettings = {
  _cache: {},

  init: async function() {
    var all = await SettingsDB.getAll();
    this._cache = all;
  },

  get: function(key, defaultVal) {
    if (this._cache[key] !== undefined) return this._cache[key];
    return defaultVal;
  },

  set: async function(key, value) {
    this._cache[key] = value;
    await SettingsDB.set(key, value);
  },

  // --- API Provider ---
  getApiProvider: function() { return this.get('apiProvider', 'deepseek'); },
  getApiUrl: function() { return ''; },
  getApiKey: function() { return ''; },
  getModel: function() { return ''; },
  getTemperature: function() { return parseFloat(this.get('temperature', '0.7')); },

  // --- Appearance ---
  getTheme: function() { return this.get('theme', 'pastel'); },
  getTeacherName: function() { return this.get('teacherName', '计老师'); },

  // --- API Presets (stored as JSON) ---
  getPresets: async function() {
    var raw = this.get('apiPresets', '[]');
    try { return JSON.parse(raw); } catch(e) { return []; }
  },
  savePresets: async function(presets) {
    await this.set('apiPresets', JSON.stringify(presets));
  }
};
