/* ============================================
   Resource Library Manager — 优秀资源库
   幼师AI助手
   ============================================ */

var ResourceLibrary = {

  /**
   * Upload resources from file input
   * @param {FileList} files
   * @param {string} type - 'plan' | 'observation' | 'paper'
   * @param {function} onProgress - callback(processed, total, fileName)
   */
  uploadFiles: async function(files, type, onProgress) {
    var results = [];
    var total = files.length;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (onProgress) onProgress(i, total, file.name);

      try {
        var ext = file.name.split('.').pop().toLowerCase();
        var record = {
          type: type,
          fileName: file.name,
          fileSize: file.size,
          fileFormat: ext === 'pdf' ? 'pdf' : 'docx'
        };

        if (ext === 'pdf') {
          var pdfResult = await TemplateParser.parsePdf(file);
          record.rawText = pdfResult.fullText;
          record.rawHtml = '';
          record.sections = [];
        } else {
          var docxResult = await TemplateParser.parseDocx(file);
          record.rawHtml = docxResult.html;
          record.rawText = docxResult.html.replace(/<[^>]+>/g, '');
          record.sections = docxResult.sections;
        }

        var id = await ResourceDB.add(record);
        results.push({ id: id, fileName: file.name, success: true });
      } catch(e) {
        console.error('[ResourceLibrary] 上传失败:', file.name, e);
        results.push({ fileName: file.name, success: false, error: e.message });
      }
    }

    if (onProgress) onProgress(total, total, '');
    return results;
  },

  /**
   * Get resources grouped by type for display
   */
  getStats: async function() {
    return await ResourceDB.countByType();
  },

  /**
   * Get all resources, optionally filtered by type
   */
  getResources: async function(type) {
    return await ResourceDB.getAll(type);
  },

  /**
   * Delete a resource by id
   */
  deleteResource: async function(id) {
    return await ResourceDB.remove(id);
  },

  /**
   * Get resource content summaries for AI context injection
   * Used by prompt-builder to automatically include resource context
   */
  getContextForType: async function(type) {
    var summaries = await ResourceDB.getSummaries(type);

    if (summaries.length === 0) return '';

    var previews = summaries.map(function(s, idx) {
      var text = s.content || '';
      var plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      var preview = plain.substring(0, 200);
      if (plain.length > 200) preview += '...';

      var entry = (idx + 1) + '. 《' + s.fileName.replace(/\.(docx|pdf)$/i, '') + '》\n' + preview;

      // For papers, also include section/heading structure for outline reference
      var sections = s.sections || [];
      if (type === 'paper' && sections.length > 0) {
        var headings = sections.filter(function(sec) { return sec.heading && sec.heading.trim(); })
          .map(function(sec) { return (sec.heading || '').trim(); });
        if (headings.length > 0) {
          entry += '\n  [章节结构: ' + headings.join(' → ') + ']';
        }
      }

      return entry;
    });

    var typeName = { plan: '教案', observation: '观察记录', paper: '论文', story: '课程故事' }[type] || '文档';

    return '用户已上传 ' + summaries.length + ' 篇优秀' + typeName + '供参考学习。\n'
      + '以下是这些文档的内容摘要，请在生成时参考其风格和质量标准：\n\n'
      + previews.join('\n\n');
  },

  /**
   * Get paper topic library: static file + resource file names
   * Used by prompt-builder to inject topic references for AI to learn from
   */
  getTopicLibrary: async function() {
    var parts = [];

    // 1. Static topic file
    try {
      var resp = await fetch('data/topics.txt');
      if (resp.ok) {
        var text = await resp.text();
        var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 5; });
        if (lines.length > 0) {
          parts.push('【精选题目库】（共' + lines.length + '题，请学习其选题角度、标题结构和用词方式）\n' + lines.join('\n'));
        }
      }
    } catch(e) {}

    // 2. Resource library paper titles
    var papers = await ResourceDB.getAll('paper');
    if (papers && papers.length > 0) {
      var topics = [];
      for (var i = 0; i < papers.length; i++) {
        var name = (papers[i].fileName || '').replace(/\.(docx|pdf)$/i, '').trim();
        if (name) topics.push(name);
      }
      if (topics.length > 0) {
        parts.push('【用户资源库题目】（共' + topics.length + '篇，请参考但不重复）\n' + topics.map(function(t, i) { return (i + 1) + '. ' + t; }).join('\n'));
      }
    }

    if (parts.length === 0) return '';

    return '以下是已收录的论文题目，请学习其选题角度、标题结构和用词方式，在此基础上组合创新，不要简单重复：\n\n'
      + parts.join('\n\n');
  },

  /**
   * Get fuller resource context for style/personalization injection (降重)
   * Returns more text per resource (default 2000 chars) for stronger style signal
   */
  getFullContextForType: async function(type, maxChars) {
    maxChars = maxChars || 2000;
    var summaries = await ResourceDB.getSummaries(type);

    if (summaries.length === 0) return '';

    var previews = summaries.map(function(s, idx) {
      var text = s.content || '';
      var plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      var preview = plain.substring(0, maxChars);
      if (plain.length > maxChars) preview += '...';

      var entry = (idx + 1) + '. 《' + s.fileName.replace(/\.(docx|pdf)$/i, '') + '》\n' + preview;

      // For papers, also include section/heading structure
      var sections = s.sections || [];
      if (type === 'paper' && sections.length > 0) {
        var headings = sections.filter(function(sec) { return sec.heading && sec.heading.trim(); })
          .map(function(sec) { return (sec.heading || '').trim(); });
        if (headings.length > 0) {
          entry += '\n  [章节结构: ' + headings.join(' → ') + ']';
        }
      }

      return entry;
    });

    var typeName = { plan: '教案', observation: '观察记录', paper: '论文', story: '课程故事' }[type] || '文档';

    return '以下是你的个人写作样本（你之前撰写或上传的' + typeName + '片段），请模仿其用词习惯、句式节奏和论证方式来撰写新论文。\n\n'
      + previews.join('\n\n');
  }
};
