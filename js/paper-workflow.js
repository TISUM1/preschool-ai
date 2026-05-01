/* ============================================
   Paper Workflow — 论文四阶段生成
   幼师AI助手
   ============================================ */

var PaperWorkflow = {

  state: {
    topicSource: '',     // 'has' | 'none'
    topic: '',
    topicOptions: [],    // AI-generated 5 topics
    wordCount: 4000,
    outline: '',
    outlineItems: [],
    content: '',
    sections: []
  },

  init: function() {
    this.state = {
      topicSource: '', topic: '', topicOptions: [],
      wordCount: 4000, outline: '', outlineItems: [],
      content: '', sections: []
    };
  },

  // --- Stage 1a: Has Topic ---

  startWithTopic: function() {
    this.init();
    this.state.topicSource = 'has';
    Router.navigate('generate-paper-hastopic');
  },

  generateOutline: async function() {
    var topic = document.getElementById('paper-topic') ? document.getElementById('paper-topic').value.trim() : '';
    if (!topic) {
      Toast.show('请输入论文题目', 'error');
      return;
    }

    this.state.topic = topic;
    var wordEl = document.querySelector('#paper-wordcount .tag.active');
    if (!wordEl) {
      var wordBtns = document.querySelectorAll('#paper-wordcount .tag');
      if (wordBtns.length > 1) wordBtns[1].classList.add('active');
    }
    var activeWord = document.querySelector('#paper-wordcount .tag.active');
    this.state.wordCount = activeWord ? parseInt(activeWord.textContent) : 4000;

    App.showLoading('正在生成论文大纲...');

    try {
      var context = {
        userInput: { topic: topic },
        paperState: { stage: 'outline', topic: topic, wordCount: this.state.wordCount }
      };
      var messages = await PromptBuilder.buildMessages('paper', context);

      var outlineText = await ApiClient.chat(messages, { stream: false, max_tokens: 8192 });
      this.state.outline = outlineText;

      // Self-check outline
      await this.checkResult('outline');

      // Parse outline into items for editing
      this.state.outlineItems = this._parseOutline(this.state.outline);

      // Show outline editor
      this._renderOutlineEditor();
      App.hideLoading();
      Toast.show('大纲已生成，可以修改后继续');
    } catch(e) {
      App.hideLoading();
      Toast.show('生成失败: ' + e.message, 'error');
    }
  },

  fillContent: async function() {
    // Sync DOM edits back to outlineItems and serialize
    this._syncOutlineFromDom();
    this.state.outline = this._serializeOutline();

    // Read personal material from textarea
    var materialEl = document.getElementById('personal-material');
    this.state.personalMaterial = materialEl ? materialEl.value.trim() : '';

    App.showLoading('正在填充论文内容...');

    try {
      var context = {
        userInput: { topic: this.state.topic },
        paperState: {
          stage: 'content',
          topic: this.state.topic,
          wordCount: this.state.wordCount,
          outline: this.state.outline,
          personalMaterial: this.state.personalMaterial
        }
      };
      var messages = await PromptBuilder.buildMessages('paper', context);

      var previewEl = document.getElementById('paper-preview');
      var fullText = '';

      if (previewEl) {
        previewEl.style.display = 'block';
        previewEl.innerHTML = '';
      }

      fullText = await ApiClient.chatStream(messages, function(delta, text) {
        if (previewEl) {
          previewEl.innerHTML = App.markdownToHtml(text);
          previewEl.scrollTop = previewEl.scrollHeight;
        }
      });

      this.state.content = fullText;
      this._showSaveActions();
      // Show rewrite action buttons
      var rewriteActions = document.getElementById('hs-rewrite-actions');
      if (rewriteActions) rewriteActions.style.display = 'flex';
      App.hideLoading();

      // Self-check content
      await this.checkResult('content');

      Toast.show('论文初稿已生成');
    } catch(e) {
      App.hideLoading();
      Toast.show('生成失败: ' + e.message, 'error');
    }
  },

  // --- Stage 1b: No Topic (AI recommends) ---

  startWithoutTopic: function() {
    this.init();
    this.state.topicSource = 'none';
    Router.navigate('generate-paper-notopic');
  },

  generateTopics: async function() {
    var direction = document.getElementById('paper-direction') ? document.getElementById('paper-direction').value.trim() : '';
    if (!direction) {
      Toast.show('请描述你的研究方向', 'error');
      return;
    }

    App.showLoading('AI 正在为你推荐选题...');

    try {
      var resourceContext = await ResourceLibrary.getContextForType('paper');
      var messages = PromptBuilder.buildPaperTopicRequest(direction, resourceContext);
      var rawText = await ApiClient.chat(messages, { stream: false });

      // Parse 5 topics from AI response
      var topics = this._parseTopics(rawText);
      this.state.topicOptions = topics;

      this._renderTopicOptions(topics);
      App.hideLoading();
    } catch(e) {
      App.hideLoading();
      Toast.show('生成失败: ' + e.message, 'error');
    }
  },

  selectTopic: function(index) {
    var topic = this.state.topicOptions[index];
    if (!topic) return;
    this.state.topic = topic;
    this.state.topicSource = 'none';

    // Navigate to has-topic flow with pre-filled topic
    Router.navigate('generate-paper-hastopic');

    // Topic will be pre-filled by the page-load handler
  },

  confirmOutline: function() {
    // Sync DOM edits back to outlineItems
    this._syncOutlineFromDom();
    // Serialize with proper Chinese numbering
    this.state.outline = this._serializeOutline();

    Toast.show('大纲已确认，请生成论文内容');

    // Hide confirm/regen, show fill button + content area
    var confirmBtn = document.getElementById('hs-btn-confirm');
    var regenBtn = document.getElementById('hs-btn-regen');
    var fillBtn = document.getElementById('hs-btn-fill');
    var step4 = document.getElementById('hs-step4');
    if (confirmBtn) confirmBtn.style.display = 'none';
    if (regenBtn) regenBtn.style.display = 'none';
    if (fillBtn) fillBtn.style.display = 'block';
    if (step4) step4.style.display = 'block';
  },

  polishContent: async function() {
    if (!this.state.content) {
      Toast.show('请先生成论文内容', 'error');
      return;
    }

    App.showLoading('正在学术精修...');

    try {
      var styleSamples = await PromptBuilder.getStyleSamples();
      var context = {
        styleSamples: styleSamples,
        userInput: { topic: this.state.topic },
        paperState: {
          stage: 'polish',
          topic: this.state.topic,
          content: this.state.content
        }
      };
      var messages = await PromptBuilder.buildMessages('paper', context);

      var previewEl = document.getElementById('paper-preview');
      var fullText = '';

      if (previewEl) {
        previewEl.style.display = 'block';
        previewEl.innerHTML = '';
      }

      fullText = await ApiClient.chatStream(messages, function(delta, text) {
        if (previewEl) {
          previewEl.innerHTML = App.markdownToHtml(text);
          previewEl.scrollTop = previewEl.scrollHeight;
        }
      }, { temperature: 0.8, max_tokens: 8192, frequency_penalty: 0.5, presence_penalty: 0.3 });

      this.state.content = fullText;
      App.hideLoading();

      // Self-check polish
      await this.checkResult('polish');

      Toast.show('学术精修完成');
    } catch(e) {
      App.hideLoading();
      Toast.show('精修失败: ' + e.message, 'error');
    }
  },

  rewriteContent: async function() {
    if (!this.state.content) {
      Toast.show('请先生成论文内容', 'error');
      return;
    }

    var rewriteApiUrl = AppSettings.getRewriteApiUrl ? AppSettings.getRewriteApiUrl() : '';
    var rewriteApiKey = AppSettings.getRewriteApiKey ? AppSettings.getRewriteApiKey() : '';
    var rewriteModel = AppSettings.getRewriteModel ? AppSettings.getRewriteModel() : '';

    // Dual-model rewrite: first pass with primary model (polish), second pass with rewrite model
    if (rewriteApiUrl && rewriteApiKey && rewriteModel) {
      App.showLoading('双模型校准：第一轮精修...');

      try {
        var styleSamples = await PromptBuilder.getStyleSamples();

        // Stage 1: Polish with primary model
        var polishContext = {
          styleSamples: styleSamples,
          userInput: { topic: this.state.topic },
          paperState: {
            stage: 'polish',
            topic: this.state.topic,
            content: this.state.content
          }
        };
        var polishMessages = await PromptBuilder.buildMessages('paper', polishContext);

        var previewEl = document.getElementById('paper-preview');
        if (previewEl) {
          previewEl.style.display = 'block';
          previewEl.innerHTML = '';
        }

        var polishedText = await ApiClient.chatStream(polishMessages, function(delta, text) {
          if (previewEl) {
            previewEl.innerHTML = App.markdownToHtml(text);
            previewEl.scrollTop = previewEl.scrollHeight;
          }
        }, { temperature: 0.8, max_tokens: 8192, frequency_penalty: 0.5, presence_penalty: 0.3 });

        // Stage 2: Rewrite with second model
        App.showLoading('双模型校准：第二轮改写...');

        var rewriteContext = {
          styleSamples: styleSamples,
          userInput: { topic: this.state.topic },
          paperState: {
            stage: 'rewrite',
            topic: this.state.topic,
            content: polishedText
          }
        };
        var rewriteMessages = await PromptBuilder.buildMessages('paper', rewriteContext);

        if (previewEl) previewEl.innerHTML = '';

        var finalText = await ApiClient.chatStream(rewriteMessages, function(delta, text) {
          if (previewEl) {
            previewEl.innerHTML = App.markdownToHtml(text);
            previewEl.scrollTop = previewEl.scrollHeight;
          }
        }, {
          apiUrl: rewriteApiUrl,
          apiKey: rewriteApiKey,
          model: rewriteModel,
          temperature: 0.9, max_tokens: 8192, frequency_penalty: 0.8, presence_penalty: 0.5
        });

        this.state.content = finalText;
        App.hideLoading();

        // Self-check rewrite
        await this.checkResult('rewrite');

        Toast.show('双模型校准完成（主模型精修 + 降重模型改写）');
      } catch(e) {
        App.hideLoading();
        Toast.show('双模型校准失败: ' + e.message, 'error');
      }
    } else {
      // Single-model rewrite (no second model configured)
      var proceed = confirm('建议在设置中配置降重专用模型，双模型串联校准效果更佳。\n\n是否使用当前模型进行单模型改写？');
      if (!proceed) return;

      App.showLoading('正在校准...');

      try {
        var styleSamples = await PromptBuilder.getStyleSamples();
        var context = {
          styleSamples: styleSamples,
          userInput: { topic: this.state.topic },
          paperState: {
            stage: 'rewrite',
            topic: this.state.topic,
            content: this.state.content
          }
        };
        var messages = await PromptBuilder.buildMessages('paper', context);

        var previewEl = document.getElementById('paper-preview');
        if (previewEl) {
          previewEl.style.display = 'block';
          previewEl.innerHTML = '';
        }

        var fullText = await ApiClient.chatStream(messages, function(delta, text) {
          if (previewEl) {
            previewEl.innerHTML = App.markdownToHtml(text);
            previewEl.scrollTop = previewEl.scrollHeight;
          }
        }, { temperature: 0.9, max_tokens: 8192, frequency_penalty: 0.8, presence_penalty: 0.5 });

        this.state.content = fullText;
        App.hideLoading();

        // Self-check rewrite
        await this.checkResult('rewrite');

        Toast.show('校准完成');
      } catch(e) {
        App.hideLoading();
        Toast.show('校准失败: ' + e.message, 'error');
      }
    }
  },

  // --- Common ---

  saveDocument: async function() {
    var title = this.state.topic || '未命名论文';
    var doc = {
      title: title,
      type: 'paper',
      content: this.state.content,
      paperState: {
        topicSource: this.state.topicSource,
        topic: this.state.topic,
        topicOptions: this.state.topicOptions,
        wordCount: this.state.wordCount,
        outline: this.state.outline,
        outlineHistory: []
      },
      userInput: { topic: this.state.topic, requirements: '', ageGroup: '' },
      sections: []
    };

    try {
      var id = await DocumentDB.add(doc);
      Toast.show('论文已保存');
      Router.navigate('documents');
    } catch(e) {
      Toast.show('保存失败: ' + e.message, 'error');
    }
  },

  exportDocx: async function() {
    var htmlContent = App.markdownToHtml(this.state.content);
    var title = this.state.topic || '论文';
    try {
      await DocxExporter.exportHtml(title, htmlContent, title);
      Toast.show('导出成功！');
    } catch(e) {
      Toast.show('导出失败: ' + e.message, 'error');
    }
  },

  // --- Helpers ---

  /** Convert 0-based index to Chinese number: 0→一, 1→二, …, 9→十 */
  _cnNum: function(index) {
    var chars = '一二三四五六七八九十';
    return index < chars.length ? chars[index] : String(index + 1);
  },

  _parseOutline: function(text) {
    var items = [];
    var lines = text.split('\n');
    var h1Re = /^[一二三四五六七八九十]+[、\.．]\s*/;
    var h2Re = /^[（(][一二三四五六七八九十]+[）)]\s*/;
    var currentH1 = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      // Filter AI preamble/pleasantries
      if (/^(好的|根据您的|以下是为|为您撰写|请查阅|综上所述|希望以上|研究员)/.test(line)) continue;
      // Strip markdown bold markers
      line = line.replace(/\*\*([^*]+)\*\*/g, '$1');

      // Keywords
      if (/^关键词[：:]/.test(line)) {
        items.push({ type: 'keywords', text: line.replace(/^关键词[：:]\s*/, ''), number: '', children: [] });
        continue;
      }
      // Abstract
      if (/^摘要[：:]/.test(line)) {
        items.push({ type: 'abstract', text: line.replace(/^摘要[：:]\s*/, ''), number: '', children: [] });
        continue;
      }
      // References
      if (/^参考文献/.test(line)) {
        items.push({ type: 'references', text: '参考文献', number: '', children: [] });
        continue;
      }
      // Level-2 heading: （一）or (一)
      var h2Match = line.match(h2Re);
      if (h2Match) {
        var h2Item = { type: 'h2', text: line.replace(h2Re, '').trim(), number: h2Match[0].replace(/\s*$/, ''), children: [] };
        if (currentH1) {
          currentH1.children.push(h2Item);
        } else {
          items.push(h2Item);
        }
        continue;
      }
      // Level-1 heading: 一、 二、 etc.
      var h1Match = line.match(h1Re);
      if (h1Match) {
        var h1Text = line.replace(h1Re, '').trim();
        var isConclusion = /结语|结论/.test(h1Text);
        var h1Item = {
          type: isConclusion ? 'conclusion' : 'h1',
          text: h1Text,
          number: h1Match[0].replace(/\s*$/, ''),
          children: []
        };
        items.push(h1Item);
        currentH1 = h1Item;
        continue;
      }
      // Title: first non-structured line before any heading
      if (items.length === 0 || (items.length === 1 && items[0].type === 'title')) {
        // Check if we already have a title
        var hasTitle = items.some(function(it) { return it.type === 'title'; });
        if (!hasTitle && line.length > 2 && !/^摘要|^关键词|^参考文献/.test(line)) {
          items.unshift({ type: 'title', text: line, number: '', children: [] });
          continue;
        }
      }
    }

    // Fallback: if no title found, use state.topic
    var hasTitleItem = items.some(function(it) { return it.type === 'title'; });
    if (!hasTitleItem && this.state.topic) {
      items.unshift({ type: 'title', text: this.state.topic, number: '', children: [] });
    }

    // Fallback: if no structured items found at all, split by double newlines
    var structuredCount = items.filter(function(it) { return it.type === 'h1' || it.type === 'h2' || it.type === 'conclusion'; }).length;
    if (structuredCount === 0) {
      var parts = text.split(/\n\n+/).filter(function(p) { return p.trim(); });
      if (parts.length > 1) {
        items = parts.map(function(p) {
          return { type: 'h1', text: p.trim().split('\n')[0], number: '', children: [] };
        });
      }
    }

    return items;
  },

  _renderOutlineEditor: function() {
    var container = document.getElementById('outline-editor');
    var previewArea = document.getElementById('outline-preview');
    if (previewArea) previewArea.style.display = 'none';

    if (!container) return;

    var items = this.state.outlineItems;
    if (items.length === 0) {
      // Fallback: use raw outline text
      var rawItems = this.state.outline.split('\n').filter(function(l) { return l.trim(); });
      items = rawItems.map(function(l) { return { type: 'h1', text: l, number: '', children: [] }; });
      this.state.outlineItems = items;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      if (item.type === 'title') {
        html += '<div class="outline-section outline-title">'
          + '<input type="text" class="outline-input-title" data-path="' + i + '" value="' + App.escapeHtml(item.text) + '" onchange="PaperWorkflow._updateItem(this.dataset.path, this.value)">'
          + '</div>';
      } else if (item.type === 'abstract') {
        html += '<div class="outline-section outline-meta">'
          + '<span class="outline-label">摘要</span>'
          + '<textarea class="outline-input-abstract" data-path="' + i + '" onchange="PaperWorkflow._updateItem(this.dataset.path, this.value)" rows="3">' + App.escapeHtml(item.text) + '</textarea>'
          + '</div>';
      } else if (item.type === 'keywords') {
        html += '<div class="outline-section outline-meta">'
          + '<span class="outline-label">关键词</span>'
          + '<input type="text" class="outline-input-keywords" data-path="' + i + '" value="' + App.escapeHtml(item.text) + '" onchange="PaperWorkflow._updateItem(this.dataset.path, this.value)">'
          + '</div>';
      } else if (item.type === 'h1' || item.type === 'conclusion') {
        var cls = item.type === 'conclusion' ? 'outline-section outline-h1 outline-conclusion' : 'outline-section outline-h1';
        var num = item.number || (this._cnNum(i) + '、');
        html += '<div class="' + cls + '">'
          + '<span class="outline-h1-num">' + App.escapeHtml(num) + '</span>'
          + '<input type="text" class="outline-input-h1" data-path="' + i + '" value="' + App.escapeHtml(item.text) + '" onchange="PaperWorkflow._updateItem(this.dataset.path, this.value)">'
          + '</div>';
        // Render h2 children
        if (item.children) {
          for (var j = 0; j < item.children.length; j++) {
            var child = item.children[j];
            var childNum = child.number || ('（' + this._cnNum(j) + '）');
            html += '<div class="outline-section outline-h2">'
              + '<span class="outline-h2-num">' + App.escapeHtml(childNum) + '</span>'
              + '<input type="text" class="outline-input-h2" data-path="' + i + '.' + j + '" value="' + App.escapeHtml(child.text) + '" onchange="PaperWorkflow._updateItem(this.dataset.path, this.value)">'
              + '</div>';
          }
        }
      } else if (item.type === 'references') {
        html += '<div class="outline-section outline-references">'
          + '<span>参考文献</span>'
          + '</div>';
      }
    }

    container.innerHTML = html;
    container.style.display = 'block';

    // Show next action button
    var actions = document.getElementById('outline-actions');
    if (actions) actions.style.display = 'block';
  },

  _updateItem: function(path, value) {
    var parts = String(path).split('.');
    var item = this.state.outlineItems[parseInt(parts[0])];
    if (parts.length === 1) {
      item.text = value;
    } else if (parts.length === 2 && item.children) {
      var child = item.children[parseInt(parts[1])];
      if (child) child.text = value;
    }
  },

  /** Read all data-path inputs from DOM and sync back to outlineItems */
  _syncOutlineFromDom: function() {
    var self = this;
    var inputs = document.querySelectorAll('#outline-editor [data-path]');
    for (var k = 0; k < inputs.length; k++) {
      var path = inputs[k].getAttribute('data-path');
      self._updateItem(path, inputs[k].value);
    }
  },

  /** Serialize structured outlineItems to text with Chinese numbering */
  _serializeOutline: function() {
    var lines = [];
    var h1Count = 0;
    var items = this.state.outlineItems;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.type === 'title') {
        lines.push(item.text);
      } else if (item.type === 'abstract') {
        lines.push('摘要：' + item.text);
      } else if (item.type === 'keywords') {
        lines.push('关键词：' + item.text);
      } else if (item.type === 'h1' || item.type === 'conclusion') {
        h1Count++;
        lines.push(this._cnNum(h1Count - 1) + '、' + item.text);
        if (item.children) {
          for (var j = 0; j < item.children.length; j++) {
            lines.push('（' + this._cnNum(j) + '）' + item.children[j].text);
          }
        }
      } else if (item.type === 'references') {
        lines.push('参考文献');
      }
    }
    return lines.join('\n');
  },

  _parseTopics: function(text) {
    var topics = [];
    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // Match patterns like "1. xxx" or "1、xxx" or "- xxx"
      var match = line.match(/^[\d]+[\.、．)]\s*(.+)/);
      if (match) {
        var topic = match[1].trim();
        // Clean up: remove markdown bold, quotes etc
        topic = topic.replace(/[*"「」""]/g, '').trim();
        if (topic.length > 3) {
          topics.push(topic);
        }
      }
    }

    // Fallback: try to extract any line that looks like a title
    if (topics.length === 0) {
      for (var j = 0; j < lines.length; j++) {
        var l = lines[j].trim();
        if (l.length > 5 && l.length < 100 && !l.startsWith('以下') && !l.startsWith('推荐')) {
          topics.push(l.replace(/[*"「」""]/g, '').trim());
        }
      }
    }

    return topics.slice(0, 5);
  },

  _renderTopicOptions: function(topics) {
    var container = document.getElementById('topic-options');
    if (!container) return;

    var html = '';
    for (var i = 0; i < topics.length; i++) {
      html += '<div class="topic-option" onclick="PaperWorkflow.selectTopic(' + i + ')">'
        + '<span class="topic-num">' + (i + 1) + '</span>'
        + '<span>' + App.escapeHtml(topics[i]) + '</span>'
        + '</div>';
    }

    html += '<button class="btn btn-outline btn-block" style="margin-top:10px;" onclick="PaperWorkflow.generateTopics()">🔄 重新生成选题</button>';

    container.innerHTML = html;
    container.style.display = 'block';
  },

  _showSaveActions: function() {
    var actions = document.getElementById('paper-save-actions');
    if (actions) actions.style.display = 'block';
  }
};
