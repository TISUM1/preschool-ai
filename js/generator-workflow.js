/* ============================================
   Generator Workflow — 教案/观察记录/自由生成
   幼师AI助手
   ============================================ */

var GeneratorWorkflow = {

  // Session-only template data (discarded after generation)
  _sessionTemplates: [],

  init: function() {
    this._sessionTemplates = [];
  },

  /**
   * Upload templates for current session only
   * @param {FileList} files - .docx files selected by user
   */
  uploadTemplates: async function(files, containerId) {
    var self = this;
    var container = document.getElementById(containerId);
    if (!container) return;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!file.name.endsWith('.docx')) {
        Toast.show(file.name + ' 不是 .docx 文件，已跳过', 'error');
        continue;
      }

      try {
        var parsed = await TemplateParser.parseDocx(file);
        self._sessionTemplates.push({
          fileName: file.name,
          html: parsed.html,
          sections: parsed.sections,
          content: parsed.html
        });
        self._renderTemplateList(container);
      } catch(e) {
        Toast.show('解析失败: ' + file.name, 'error');
      }
    }
  },

  /**
   * Remove a template from current session
   */
  removeTemplate: function(index, containerId) {
    this._sessionTemplates.splice(index, 1);
    var container = document.getElementById(containerId);
    if (container) this._renderTemplateList(container);
  },

  /**
   * Get template contents for prompt context
   */
  getTemplateContents: function() {
    return this._sessionTemplates.map(function(t) {
      return { fileName: t.fileName, content: t.content };
    });
  },

  /**
   * Clear all session templates
   */
  clearTemplates: function() {
    this._sessionTemplates = [];
  },

  _renderTemplateList: function(container) {
    var self = this;
    var html = '';

    if (this._sessionTemplates.length === 0) {
      html = '<div class="file-row upload-placeholder" onclick="GeneratorWorkflow._triggerUpload(\'tmpl-upload-input\')">'
        + '<span style="font-size:12px;color:var(--text-muted);">+ 上传模板文件（可多选，仅本次有效）</span></div>';
    } else {
      for (var i = 0; i < this._sessionTemplates.length; i++) {
        var t = this._sessionTemplates[i];
        html += '<div class="file-row">'
          + '<span class="file-icon">📝</span>'
          + '<div class="file-info"><div class="file-name">' + App.escapeHtml(t.fileName) + '</div>'
          + '<div class="file-meta">' + (t.sections ? t.sections.length + ' 个章节' : '') + '</div></div>'
          + '<span class="file-remove" onclick="GeneratorWorkflow.removeTemplate(' + i + ',\'template-list\')">移除</span>'
          + '</div>';
      }
      html += '<div class="file-row upload-placeholder" onclick="GeneratorWorkflow._triggerUpload(\'tmpl-upload-input\')">'
        + '<span style="font-size:12px;color:var(--text-muted);">+ 继续添加模板文件</span></div>';
    }

    container.innerHTML = html;
  },

  _triggerUpload: function(inputId) {
    var input = document.getElementById(inputId);
    if (input) input.click();
  },

  /**
   * Handle type-specific generation
   * @param {string} type - 'plan' | 'observation' | 'other'
   */
  generate: async function(type) {
    var topic = document.getElementById('gen-topic') ? document.getElementById('gen-topic').value.trim() : '';
    var requirements = document.getElementById('gen-requirements') ? document.getElementById('gen-requirements').value.trim() : '';
    var ageGroup = document.getElementById('gen-agegroup') ? document.getElementById('gen-agegroup').value : '';
    var matchFormatEl = document.getElementById('gen-match-format');
    var matchFormat = matchFormatEl ? matchFormatEl.classList.contains('on') : false;

    if (!topic && !requirements) {
      Toast.show('请输入主题或要求', 'error');
      return;
    }

    App.showLoading('AI 正在生成中...');

    try {
      // Build context
      var context = {
        templateContents: this.getTemplateContents(),
        matchFormat: matchFormat,
        userInput: {
          topic: topic,
          requirements: requirements,
          ageGroup: ageGroup
        }
      };

      var messages = await PromptBuilder.buildMessages(type, context);

      // Stream output to preview area
      var previewCard = document.getElementById('gen-preview');
      var previewEl = document.getElementById('gen-preview-content');
      if (previewCard) previewCard.style.display = 'block';
      if (previewEl) previewEl.innerHTML = '';

      var fullText = await ApiClient.chatStream(messages, function(delta, text) {
        if (previewEl) {
          // Convert markdown-like text to HTML for preview
          var displayHtml = App.markdownToHtml(text);
          previewEl.innerHTML = displayHtml;
        }
      });

      App.hideLoading();

      // Show action buttons
      var actionsEl = document.getElementById('gen-actions');
      if (actionsEl) {
        actionsEl.style.display = 'block';
        actionsEl.setAttribute('data-content', fullText);
        actionsEl.setAttribute('data-type', type);
        actionsEl.setAttribute('data-topic', topic);
      }

      Toast.show('生成完成！');

    } catch(e) {
      App.hideLoading();
      Toast.show('生成失败: ' + e.message, 'error');
    }
  },

  /**
   * Save generated content to document library
   */
  saveDocument: async function(type) {
    var actionsEl = document.getElementById('gen-actions');
    if (!actionsEl) return;

    var content = actionsEl.getAttribute('data-content') || '';
    var topic = actionsEl.getAttribute('data-topic') || '';
    var title = topic || ('未命名' + { plan: '教案', observation: '观察记录', other: '内容' }[type] || '文档');

    var ageGroup = document.getElementById('gen-agegroup') ? document.getElementById('gen-agegroup').value : '';

    var doc = {
      title: title,
      type: type,
      content: content,
      userInput: {
        topic: topic,
        requirements: document.getElementById('gen-requirements') ? document.getElementById('gen-requirements').value : '',
        ageGroup: ageGroup
      },
      sections: []
    };

    try {
      var id = await DocumentDB.add(doc);
      // Clear session templates after save
      this.clearTemplates();
      Toast.show('已保存到历史文档');
      Router.navigate('documents');
    } catch(e) {
      Toast.show('保存失败: ' + e.message, 'error');
    }
  },

  /**
   * Export current content to .docx
   */
  exportDocx: async function() {
    var actionsEl = document.getElementById('gen-actions');
    if (!actionsEl) return;

    var content = actionsEl.getAttribute('data-content') || '';
    var topic = actionsEl.getAttribute('data-topic') || '文档';
    var type = actionsEl.getAttribute('data-type') || 'document';

    var htmlContent = App.markdownToHtml(content);

    try {
      await DocxExporter.exportHtml(topic, htmlContent, topic);
      Toast.show('导出成功！');
    } catch(e) {
      Toast.show('导出失败: ' + e.message, 'error');
    }
  }
};
