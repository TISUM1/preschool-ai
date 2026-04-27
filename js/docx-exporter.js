/* ============================================
   .docx Export Engine — 幼师AI助手
   Uses docx.js library for Word document generation
   ============================================ */

var DocxExporter = {

  /**
   * Export HTML content to .docx file
   * @param {string} title - document title
   * @param {string} htmlContent - HTML content to convert
   * @param {string} fileName - output file name (without extension)
   */
  exportHtml: async function(title, htmlContent, fileName) {
    if (typeof docx === 'undefined') {
      throw new Error('docx.js 库未加载，请检查网络连接');
    }

    var children = this.htmlToDocxChildren(htmlContent);

    var doc = new docx.Document({
      title: title,
      sections: [{
        properties: {
          page: {
            margin: {
              top: docx.convertMillimetersToTwip(25.4),
              bottom: docx.convertMillimetersToTwip(25.4),
              left: docx.convertMillimetersToTwip(31.8),
              right: docx.convertMillimetersToTwip(31.8)
            }
          }
        },
        children: children
      }]
    });

    var blob = await docx.Packer.toBlob(doc);
    this.downloadBlob(blob, (fileName || title || 'document') + '.docx');
  },

  /**
   * Convert HTML to docx.js Paragraph/Table children
   * Basic conversion: headings, paragraphs, lists, tables
   */
  htmlToDocxChildren: function(html) {
    var div = document.createElement('div');
    div.innerHTML = html;

    var children = [];
    var nodes = Array.from(div.childNodes);

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var tagName = node.tagName;

      if (!tagName) {
        // Text node
        var text = (node.textContent || '').trim();
        if (text) {
          children.push(this.makeParagraph(text));
        }
        continue;
      }

      switch(tagName) {
        case 'H1':
        case 'H2':
        case 'H3':
          var headingText = (node.textContent || '').trim();
          if (headingText) {
            var level = tagName === 'H1' ? docx.HeadingLevel.HEADING_1
              : (tagName === 'H2' ? docx.HeadingLevel.HEADING_2 : docx.HeadingLevel.HEADING_3);
            children.push(new docx.Paragraph({
              heading: level,
              children: [new docx.TextRun({ text: headingText, bold: true, font: 'SimSun' })]
            }));
          }
          break;

        case 'P':
          var pText = (node.textContent || '').trim();
          if (pText) {
            children.push(this.makeParagraph(pText));
          }
          break;

        case 'UL':
          var lis = node.querySelectorAll('li');
          for (var j = 0; j < lis.length; j++) {
            var liText = (lis[j].textContent || '').trim();
            if (liText) {
              children.push(new docx.Paragraph({
                bullet: { level: 0 },
                children: [new docx.TextRun({ text: liText, font: 'SimSun' })]
              }));
            }
          }
          break;

        case 'OL':
          var olis = node.querySelectorAll('li');
          for (var k = 0; k < olis.length; k++) {
            var oliText = (olis[k].textContent || '').trim();
            if (oliText) {
              children.push(new docx.Paragraph({
                numbering: { reference: 'default-numbering', level: 0 },
                children: [new docx.TextRun({ text: oliText, font: 'SimSun' })]
              }));
            }
          }
          break;

        case 'TABLE':
          // Basic table support
          try {
            var rows = [];
            var trs = node.querySelectorAll('tr');
            for (var r = 0; r < trs.length; r++) {
              var cells = [];
              var tds = trs[r].querySelectorAll('td, th');
              for (var c = 0; c < tds.length; c++) {
                cells.push(new docx.TableCell({
                  children: [this.makeParagraph((tds[c].textContent || '').trim())]
                }));
              }
              if (cells.length > 0) {
                rows.push(new docx.TableRow({ children: cells }));
              }
            }
            if (rows.length > 0) {
              children.push(new docx.Table({
                rows: rows,
                width: { size: 100, type: docx.WidthType.PERCENTAGE }
              }));
            }
          } catch(e) {}

          break;

        default:
          var t = (node.textContent || '').trim();
          if (t) {
            children.push(this.makeParagraph(t));
          }
      }
    }

    // If nothing was parsed, add a simple paragraph
    if (children.length === 0) {
      children.push(this.makeParagraph(html.replace(/<[^>]+>/g, '').trim() || '(空文档)'));
    }

    return children;
  },

  makeParagraph: function(text) {
    return new docx.Paragraph({
      spacing: { after: 120, line: 360 },
      children: [new docx.TextRun({ text: text, font: 'SimSun', size: 28 })],
    });
  },

  /**
   * Trigger file download
   */
  downloadBlob: function(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }
};
