/* ============================================
   App Settings — 幼师AI助手
   API凭据不持久化，刷新后清空
   ============================================ */

var AppSettings = {

  init: async function() {
    // No-op: API credentials are not persisted
  },

  getApiUrl: function() {
    return '';
  },

  getApiKey: function() {
    return '';
  },

  getModel: function() {
    return '';
  },

  getTemperature: function() {
    return 0.7;
  },

  getTheme: function() {
    return 'pastel';
  },

  getRewriteApiUrl: function() {
    return '';
  },

  getRewriteApiKey: function() {
    return '';
  },

  getRewriteModel: function() {
    return '';
  },

  getTeacherName: async function() {
    return await SettingsDB.get('teacherName', '');
  }
};
