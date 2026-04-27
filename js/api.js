/* ============================================
   Multi-API Client — 幼师AI助手
   Supports: DeepSeek, Qwen, custom OpenAI-compatible
   With streaming SSE support
   ============================================ */

var ApiClient = {

  /**
   * Build request body compatible with OpenAI Chat Completions format
   */
  buildRequest: function(messages, options) {
    options = options || {};
    return {
      model: AppSettings.getModel(),
      messages: messages,
      temperature: options.temperature || AppSettings.getTemperature(),
      top_p: options.top_p || 1.0,
      stream: options.stream !== false,
      max_tokens: options.max_tokens || 4096
    };
  },

  /**
   * Non-streaming chat completion
   */
  chat: async function(messages, options) {
    var apiUrl = AppSettings.getApiUrl();
    var apiKey = AppSettings.getApiKey();

    if (!apiKey) throw new Error('请先在设置中配置 API Key');

    var body = this.buildRequest(messages, options);
    body.stream = false;

    var resp = await fetch(apiUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error(this.formatError(resp.status, errText));
    }

    var data = await resp.json();
    return data.choices[0].message.content;
  },

  /**
   * Streaming chat completion — calls onChunk for each text delta
   * Returns full text when complete
   */
  chatStream: async function(messages, onChunk, options) {
    var apiUrl = AppSettings.getApiUrl();
    var apiKey = AppSettings.getApiKey();

    if (!apiKey) throw new Error('请先在设置中配置 API Key');

    var body = this.buildRequest(messages, options);
    body.stream = true;

    var resp = await fetch(apiUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error(this.formatError(resp.status, errText));
    }

    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var fullText = '';
    var buffer = '';

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data: ')) continue;
        var dataStr = line.slice(6);
        if (dataStr === '[DONE]') break;

        try {
          var json = JSON.parse(dataStr);
          var delta = json.choices[0].delta.content;
          if (delta) {
            fullText += delta;
            if (onChunk) onChunk(delta, fullText);
          }
        } catch(e) {}
      }
    }

    return fullText;
  },

  /**
   * Human-readable error messages in Chinese
   */
  formatError: function(status, text) {
    var map = {
      401: 'API Key 无效，请检查设置',
      403: 'API 访问被拒绝，请检查 Key 权限',
      429: '请求过于频繁，请稍后再试',
      500: 'AI 服务暂时不可用，请稍后重试',
      502: '网络连接异常，请检查网络'
    };
    var msg = map[status];
    if (msg) return msg;
    try {
      var j = JSON.parse(text);
      if (j.error && j.error.message) return j.error.message;
    } catch(e) {}
    return '请求失败 (' + status + ')，请检查 API 设置';
  }
};
