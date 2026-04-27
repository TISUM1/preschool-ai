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

      var outlineText = await ApiClient.chat(messages, { stream: false });
      this.state.outline = outlineText;

      // Parse outline into items for editing
      this.state.outlineItems = this._parseOutline(outlineText);

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
    // Collect current outline from editor
    var outlineItems = document.querySelectorAll('.outline-item input');
    var updatedOutline = '';
    for (var i = 0; i < outlineItems.length; i++) {
      updatedOutline += (i + 1) + '. ' + outlineItems[i].value + '\n';
    }
    this.state.outline = updatedOutline;

    App.showLoading('正在填充论文内容...');

    try {
      var context = {
        userInput: { topic: this.state.topic },
        paperState: {
          stage: 'content',
          topic: this.state.topic,
          wordCount: this.state.wordCount,
          outline: this.state.outline
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
      App.hideLoading();
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
      var messages = PromptBuilder.buildPaperTopicRequest(direction);
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

  _parseOutline: function(text) {
    var items = [];
    var lines = text.split('\n');
    var re = /^[\d一二三四五六七八九十]+[\.、．)]\s*/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var match = line.match(re);
      if (match || (items.length === 0 && line.length > 5)) {
        items.push(line.replace(re, '').trim());
      }
    }

    // If no structured outline found, split by double newlines
    if (items.length <= 1) {
      var parts = text.split(/\n\n+/).filter(function(p) { return p.trim(); });
      if (parts.length > 1) {
        items = parts.map(function(p) { return p.trim().split('\n')[0]; });
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
      items = this.state.outline.split('\n').filter(function(l) { return l.trim(); });
      this.state.outlineItems = items;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += '<div class="outline-item">'
        + '<span class="outline-num">' + (i + 1) + '.</span>'
        + '<input type="text" value="' + App.escapeHtml(items[i]) + '" onchange="PaperWorkflow._updateOutlineItem(' + i + ', this.value)">'
        + '</div>';
    }

    container.innerHTML = html;
    container.style.display = 'block';

    // Show next action button
    var actions = document.getElementById('outline-actions');
    if (actions) actions.style.display = 'block';
  },

  _updateOutlineItem: function(index, value) {
    this.state.outlineItems[index] = value;
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

    container.innerHTML = html;
    container.style.display = 'block';
  },

  _showSaveActions: function() {
    var actions = document.getElementById('paper-save-actions');
    if (actions) actions.style.display = 'block';
  }
};
