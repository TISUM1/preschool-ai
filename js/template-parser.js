/* ============================================
   Template Parser — .docx (mammoth.js) + .pdf (PDF.js)
   幼师AI助手 — Supports multi-file parsing
   ============================================ */

pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';

var TemplateParser = {

  /**
   * Parse a single .docx file
   * Returns { html, sections, fileName, fileSize }
   */
  parseDocx: async function(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = async function(e) {
        try {
          var result = await mammoth.convertToHtml({ arrayBuffer: e.target.result });
          var html = result.value;
          var sections = TemplateParser.extractSections(html);
          resolve({
            fileName: file.name,
            fileSize: file.size,
            html: html,
            sections: sections,
            warnings: result.messages || []
          });
        } catch(err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Parse multiple .docx files
   */
  parseMultipleDocx: async function(files) {
    var results = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var parsed = await this.parseDocx(files[i]);
        results.push(parsed);
      } catch(e) {
        results.push({ fileName: files[i].name, error: e.message });
      }
    }
    return results;
  },

  /**
   * Parse a .pdf file — extract text content using PDF.js
   */
  parsePdf: async function(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = async function(e) {
        try {
          var typedarray = new Uint8Array(e.target.result);
          var pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          var fullText = '';

          for (var i = 1; i <= pdf.numPages; i++) {
            var page = await pdf.getPage(i);
            var content = await page.getTextContent();
            var pageText = content.items.map(function(item) { return item.str; }).join(' ');
            fullText += pageText + '\n\n';
          }

          resolve({
            fileName: file.name,
            fileSize: file.size,
            fullText: fullText.trim(),
            pageCount: pdf.numPages
          });
        } catch(err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Parse multiple .pdf files
   */
  parseMultiplePdf: async function(files) {
    var results = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var parsed = await this.parsePdf(files[i]);
        results.push(parsed);
      } catch(e) {
        results.push({ fileName: files[i].name, error: e.message });
      }
    }
    return results;
  },

  /**
   * Extract section structure from HTML (headings-based)
   */
  extractSections: function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    var sections = [];
    var currentSection = null;
    var nodes = Array.from(div.childNodes);

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var tagName = node.tagName;

      if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3') {
        if (currentSection && (currentSection.content || currentSection.heading)) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: (node.textContent || '').trim(),
          level: tagName === 'H1' ? 1 : (tagName === 'H2' ? 2 : 3),
          content: ''
        };
      } else if (currentSection) {
        currentSection.content += (node.outerHTML || node.textContent || '');
      } else if (node.textContent && node.textContent.trim()) {
        // Content before any heading
        currentSection = { heading: '', level: 0, content: (node.outerHTML || node.textContent || '') };
        sections.push(currentSection);
        currentSection = null;
      }
    }

    if (currentSection && (currentSection.content || currentSection.heading)) {
      sections.push(currentSection);
    }

    return sections.map(function(s, idx) { s.order = idx; return s; });
  }
};
