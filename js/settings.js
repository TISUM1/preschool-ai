/* ============================================
   App Settings — 幼师AI助手
   API凭据从IndexedDB读取，设置页输入框刷新后显示为空
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

  getApiUrl: function() { return this.get('apiUrl', ''); },
  getApiKey: function() { return this.get('apiKey', ''); },
  getModel: function() { return this.get('model', ''); },
  getTemperature: function() { return parseFloat(this.get('temperature', '0.7')); },
  getTheme: function() { return this.get('theme', 'pastel'); },

  getRewriteApiUrl: function() { return this.get('rewriteApiUrl', ''); },
  getRewriteApiKey: function() { return this.get('rewriteApiKey', ''); },
  getRewriteModel: function() { return this.get('rewriteModel', ''); },

  getTeacherName: function() { return this.get('teacherName', '计老师'); }
};