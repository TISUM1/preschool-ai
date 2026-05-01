/* ============================================
   Paper Workflow — 论文生成
   幼师AI助手
   ============================================ */

var PaperWorkflow = {

  state: {
    topicSource: '',     // 'has' | 'none'
    topic: '',
    topicOptions: [],
    wordCount: 4000,
    outline: '',
    outlineItems: [],
    content: ''
  },

  init: function() {
    this.state = {
      topicSource: '', topic: '', topicOptions: [],
      wordCount: 4000, outline: '', outlineItems: [],
      content: ''
    };
  },

  // --- Stage 1: No Topic (AI recommends) ---

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
      var messages = await PromptBuilder.buildPaperTopicRequest(direction);
      var rawText = await ApiClient.chat(messages, { stream: false });

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
    Router.navigate('generate-paper-hastopic');

    // Topic will be pre-filled by the page-load handler
  },

  // --- Stage 2: Has Topic ---

  startWithTopic: function() {
    this.init();
    this.state.topicSource = 'has';
    Router.navigate('generate-paper-hastopic');
  },

  // --- Stage 3: Generate Outline ---

  generateOutline: async function() {
    var topicInput = document.getElementById('paper-topic');
    var topic = topicInput ? topicInput.value.trim() : '';
    if (!topic) {
      Toast.show('请输入论文题目', 'error');
      return;
    }

    this.state.topic = topic;
    App.showLoading('AI 正在生成论文大纲...');

    try {
      var messages = PromptBuilder.buildOutlineRequest(topic, this.state.wordCount);
      var outline = await ApiClient.chat(messages, {
        stream: false,
        max_tokens: 8192,
        temperature: 0.7
      });

      this.state.outline = outline;

      var previewEl = document.getElementById('outline-preview');
      if (previewEl) {
        previewEl.innerHTML = App.markdownToHtml(outline);
        previewEl.style.textAlign = 'left';
        previewEl.style.background = '#fff';
        previewEl.style.padding = '12px';
        previewEl.style.fontSize = '13px';
        previewEl.style.lineHeight = '1.8';
      }

      App.hideLoading();
    } catch(e) {
      App.hideLoading();
      Toast.show('大纲生成失败: ' + e.message, 'error');
    }
  },

  // --- Helpers ---

  _parseTopics: function(text) {
    var topics = [];
    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // Try: 1. / 1、 / 1) / （1） etc.
      var match = line.match(/^[\(（]?[\d]+[\.、．)\）]\s*(.+)/);
      if (match) {
        var topic = match[1].trim().replace(/[*"「」""]/g, '').trim();
        if (topic.length > 3) topics.push(topic);
      }
    }

    // Fallback: try lines that look like titles (contain ：or 的, 15-80 chars)
    if (topics.length === 0) {
      for (var j = 0; j < lines.length; j++) {
        var l = lines[j].trim();
        if (l.length > 10 && l.length < 80 && (l.indexOf('：') !== -1 || l.indexOf('的') !== -1)) {
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
  }
};