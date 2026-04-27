/* ============================================
   Voice Input — Web Speech API wrapper
   幼师AI助手
   ============================================ */

var VoiceInput = {
  recognition: null,
  isSupported: false,
  isListening: false,
  targetInput: null,
  onResult: null,
  onStatusChange: null,

  init: function() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.isSupported = false;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.isSupported = true;

    var self = this;

    this.recognition.onresult = function(event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      if (event.results[0].isFinal && self.targetInput) {
        var el = document.getElementById(self.targetInput);
        if (el) {
          var start = el.selectionStart;
          var end = el.selectionEnd;
          var before = el.value.substring(0, start);
          var after = el.value.substring(end);
          var insert = (before.length > 0 && !before.endsWith(' ')) ? ' ' + transcript : transcript;
          el.value = before + insert + after;
          var newPos = start + insert.length;
          el.setSelectionRange(newPos, newPos);
          el.focus();
        }
      }

      if (self.onResult && event.results[0].isFinal) {
        self.onResult(transcript);
      }
    };

    this.recognition.onstart = function() {
      self.isListening = true;
      if (self.onStatusChange) self.onStatusChange('listening');
    };

    this.recognition.onend = function() {
      self.isListening = false;
      if (self.onStatusChange) self.onStatusChange('idle');
    };

    this.recognition.onerror = function(event) {
      self.isListening = false;
      if (self.onStatusChange) self.onStatusChange('error');
      if (event.error === 'not-allowed') {
        Toast.show('请允许麦克风权限后使用语音输入', 'error');
      }
    };
  },

  /**
   * Start listening, appending result to target input element
   * @param {string} targetInputId - the id of the input/textarea element
   */
  start: function(targetInputId) {
    if (!this.isSupported) {
      Toast.show('当前浏览器不支持语音输入', 'error');
      return;
    }
    if (this.isListening) {
      this.stop();
      return;
    }
    this.targetInput = targetInputId;
    try {
      this.recognition.start();
    } catch(e) {
      this.isListening = false;
    }
  },

  stop: function() {
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch(e) {}
    }
    this.isListening = false;
  },

  /**
   * Quick voice-to-text — records once, returns text
   */
  listenOnce: function(targetInputId) {
    this.start(targetInputId);
  }
};
