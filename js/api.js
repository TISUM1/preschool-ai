/* ============================================
   Multi-API Client — 幼师AI助手
   Supports: DeepSeek, Qwen, custom OpenAI-compatible
   With streaming SSE support
   ============================================ */

var ApiClient = {

  /**
   * Build the full chat completions URL from the configured API URL.
   * Handles common user input variations gracefully.
   */
  _buildUrl: function() {
    var url = (AppSettings.getApiUrl() || '').trim().replace(/\/+$/, '');
    if (!url) throw new Error('请先在设置中配置 API 地址');

    // Already a full /chat/completions endpoint — use as-is
    if (url.endsWith('/chat/completions')) return url;

    // URL already includes /v1 — just append chat/completions
    if (url.indexOf('/v1') !== -1) return url + '/chat/completions';

    // Bare domain or base path — assume OpenAI-compatible /v1/chat/completions
    return url + '/v1/chat/completions';
  },

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
   * Safely parse response body — handles HTML pages returned by wrong endpoints
   */
  _parseResponse: async function(resp, url) {
    var text = await resp.text();

    // If response looks like HTML, the API endpoint is probably wrong
    if (text.trim().startsWith('<')) {
      throw new Error('API 返回了网页而非数据（请求地址：' + url + '）\n\n'
        + '可能原因：\n1. API 地址填写有误，该地址不是有效的 API 端点\n'
        + '2. 该服务商的 API 路径不是标准的 /v1/chat/completions\n\n'
        + '建议：请在设置中填写完整的 API 地址（含 /chat/completions）');
    }

    try {
      var data = JSON.parse(text);
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      if (data.error && data.error.message) {
        throw new Error(data.error.message);
      }
      throw new Error('API 返回格式异常，请检查 API 地址和模型名称');
    } catch(e) {
      if (e.message.indexOf('API') === 0) throw e;
      throw new Error('API 返回格式异常：' + text.substring(0, 200));
    }
  },

  /**
   * Non-streaming chat completion
   */
  chat: async function(messages, options) {
    var apiKey = AppSettings.getApiKey();
    if (!apiKey) throw new Error('请先在设置中配置 API Key');

    var body = this.buildRequest(messages, options);
    body.stream = false;

    var url = this._buildUrl();
    console.log('[ApiClient] POST', url);

    var resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(body)
      });
    } catch(e) {
      console.error('[ApiClient] fetch failed:', e);
      throw new Error('连接失败，可能原因：\n1. API 地址不正确或无法访问\n2. 该 API 不支持浏览器直接调用（CORS 限制）\n3. 网络连接异常\n\n请检查 API 地址或尝试其他 API 服务商');
    }

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error(this.formatError(resp.status, errText));
    }

    return await this._parseResponse(resp, url);
  },

  /**
   * Streaming chat completion — calls onChunk for each text delta
   * Returns full text when complete
   */
  chatStream: async function(messages, onChunk, options) {
    var apiKey = AppSettings.getApiKey();
    if (!apiKey) throw new Error('请先在设置中配置 API Key');

    var body = this.buildRequest(messages, options);
    body.stream = true;

    var url = this._buildUrl();
    console.log('[ApiClient] POST (stream)', url);

    var resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(body)
      });
    } catch(e) {
      console.error('[ApiClient] fetch failed:', e);
      throw new Error('连接失败，可能原因：\n1. API 地址不正确或无法访问\n2. 该 API 不支持浏览器直接调用（CORS 限制）\n3. 网络连接异常\n\n请检查 API 地址或尝试其他 API 服务商');
    }

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error(this.formatError(resp.status, errText));
    }

    // Check if response is SSE or HTML before streaming
    var contentType = resp.headers.get('Content-Type') || '';
    if (contentType.indexOf('text/html') !== -1) {
      var htmlText = await resp.text();
      throw new Error('API 返回了网页而非数据（请求地址：' + url + '）\n\n'
        + '网页开头：' + htmlText.substring(0, 120).replace(/\n/g, ' ') + '\n\n'
        + '可能原因：API 地址不正确，请检查设置中的 API 地址');
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
      404: 'API 地址不存在（404），请检查 API 地址是否正确',
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
