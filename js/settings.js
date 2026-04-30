/* ============================================
   App Settings — 幼师AI助手
   API凭据不持久化，刷新后清空
   ============================================ */

var AppSettings = {

  getApiUrl: function() {
    return '';
  },

  getApiKey: function() {
    return '';
  },

  getModel: function() {
    return '';
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
  },

  getSchoolName: async function() {
    return await SettingsDB.get('schoolName', '');
  }
};
