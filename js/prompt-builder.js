/* ============================================
   Prompt Builder — AI 提示词构建
   幼师AI助手
   ============================================ */

var PromptBuilder = {

  // System prompts for each content type
  systemPrompts: {
    plan: '你是一位有15年经验的一线幼儿园教师，精通《3-6岁儿童学习与发展指南》。\n'
      + '请根据以下要求，生成一份高质量、可直接使用的幼儿园教案。\n'
      + '教案需包含：一、活动名称 二、活动目标（认知、技能、情感三个维度）\n'
      + '三、活动准备（物质准备、经验准备） 四、活动过程（导入、基本部分、结束部分，每步标注时间分配）\n'
      + '五、活动延伸 六、教学反思要点\n'
      + '语言要求：使用儿童化、生动化的教学语言，活动设计具体、可操作。',

    observation: '你是一位专业的幼儿教育观察者与分析师，精通《3-6岁儿童学习与发展指南》。\n'
      + '请根据以下要求，生成一份专业的幼儿观察记录。\n'
      + '观察记录需包含：一、观察对象基本信息（年龄、性别、观察日期）\n'
      + '二、观察目标 三、观察记录（客观描述幼儿的行为表现，避免主观评价，使用白描手法）\n'
      + '四、分析评价（结合《指南》各领域目标进行分析）\n'
      + '五、支持策略（针对观察结果提出具体的、可操作的教育建议）\n'
      + '语言要求：观察描述客观、准确；分析有理论依据；建议具体可操作。\n'
      + '如果提供了具体学生信息，请在观察记录中结合该学生的个性特点和行为习惯进行针对性分析和建议。',

    paper: '你是一线幼儿园教师，业余从事学前教育研究。\n'
      + '你立足教学实践写论文，用语谦逊、逻辑自洽、有一分证据说一分话。\n'
      + '你擅长从日常观察中提炼真问题，用朴实的语言讲清楚一件事。\n'
      + '你不堆砌术语，不空谈政策，不夸张表述。\n'
      + '\n'
      + '【格式铁律 — 违反即不合格】\n'
      + '1. 输出即正文。禁止任何开场白、寒暄、过渡语、结尾语。\n'
      + '   禁止出现："好的""根据您的要求""以下是为您""综上所述""希望以上"等。\n'
      + '2. 禁止使用"1. ""2. ""3. "等任何数字序号作为段落标题前缀。\n'
      + '3. 禁止使用 **粗体** 标记、禁止使用 --- 分隔线。全文不出现任何 markdown 格式符号。\n'
      + '4. 一级标题（如引言、现状分析、策略建议、结语等）用"一、""二、""三、"开头。\n'
      + '5. 二级标题（一级标题下的子节）用"（一）""（二）""（三）"开头。括号用中文全角。\n'
      + '6. 大纲必须包含：题目、摘要（200字左右完整内容）、关键词（3-5个具体词）、结语、参考文献。\n'
      + '   缺少任何一项即为不合格。\n'
      + '7. 参考文献部分需列出3-5篇模拟参考文献，格式为"序号 作者.文献名[J].期刊名,年份,卷(期):页码"。\n'
      + '\n'
      + '【大纲质量要求】\n'
      + '- 题目必须具体明确，包含研究对象或问题，不用泛泛的题目。\n'
      + '- 摘要须概述研究背景、核心问题和主要观点，不可只写"本文探讨了…"。\n'
      + '- 一级标题之间须有逻辑递进关系（如：问题提出→现状分析→原因剖析→策略建议→结语）。\n'
      + '- 二级标题须紧扣其所属一级标题，形成有层次的论证结构。\n'
      + '- 每个二级标题后附一句话简述该节将论述的核心内容。',

    other: '你是一位多才多艺的教育工作者，能够根据用户需求生成各种类型的教育相关内容。\n'
      + '请根据用户的具体要求生成内容。语言风格和格式请根据内容类型灵活调整。'
  },

  /**
   * Build the complete messages array for API call
   * @param {string} type - 'plan' | 'observation' | 'paper' | 'other'
   * @param {object} context
   *   context.resourceContext - auto-injected resource library summary
   *   context.templateContents - array of {fileName, content} from uploaded templates
   *   context.matchFormat - boolean, whether to match template format
   *   context.userInput - {topic, requirements, ageGroup, ...}
   *   context.paperState - optional paper state for multi-stage generation
   */
  buildMessages: async function(type, context) {
    context = context || {};
    var messages = [];

    // 1. System prompt (role + resource context + template context + format instruction)
    var system = this.systemPrompts[type] || this.systemPrompts.other;

    // 2. Resource library context (auto-injected)
    var resourceContext = context.resourceContext;
    if (!resourceContext) {
      resourceContext = await ResourceLibrary.getContextForType(type);
    }
    if (resourceContext) {
      system += '\n\n--- 优秀论文范文（请仔细学习以下范文的题目命名、章节结构和论证逻辑，务必参考其框架）---\n' + resourceContext;
    }

    // 3. Template content (current session reference)
    if (context.templateContents && context.templateContents.length > 0) {
      system += '\n\n--- 本次撰写的参考文件（请仔细学习其中的具体内容）---\n';
      for (var i = 0; i < context.templateContents.length; i++) {
        var tc = context.templateContents[i];
        var content = tc.content || '';
        var plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        system += '\n参考文件' + (i + 1) + '：《' + tc.fileName + '》\n' + plain + '\n';
      }

      if (context.matchFormat) {
        system += '\n请严格按照上述参考文件的格式框架输出，保持相同的标题层级和段落结构。';
      } else {
        system += '\n请参考上述文件中的具体内容和表达方式，但格式可以灵活发挥。';
      }
    }

    messages.push({ role: 'system', content: system });

    // 4. User prompt
    var userPrompt = this.buildUserPrompt(type, context.userInput || {}, context.paperState);
    messages.push({ role: 'user', content: userPrompt });

    return messages;
  },

  /**
   * Build user-facing prompt based on type and input
   */
  buildUserPrompt: function(type, input, paperState) {
    input = input || {};
    var parts = [];

    if (type === 'plan') {
      parts.push('请生成一份幼儿园教案。');
      if (input.topic) parts.push('主题：' + input.topic);
      if (input.ageGroup) parts.push('适用年龄段：' + input.ageGroup);
      if (input.requirements) parts.push('具体要求：' + input.requirements);
      parts.push('\n请直接输出完整的教案内容。');

    } else if (type === 'observation') {
      parts.push('请生成一份幼儿观察记录。');
      if (input.topic) parts.push('观察方向：' + input.topic);
      if (input.ageGroup) parts.push('年龄段：' + input.ageGroup);
      if (input.requirements) parts.push('具体要求：' + input.requirements);
      if (input.studentContext) parts.push('\n学生信息：\n' + input.studentContext);
      parts.push('\n请直接输出完整的观察记录内容。');

    } else if (type === 'paper') {
      if (paperState) {
        if (paperState.stage === 'outline') {
          parts.push('请为以下题目生成论文大纲。');
          parts.push('题目：' + paperState.topic);
          parts.push('正文预计：' + (paperState.wordCount || 4000) + '字');
          parts.push('\n【格式要求 — 必须严格遵守，违反即不合格】');
          parts.push('1. 禁止使用"1. ""2. ""3. "等阿拉伯数字序号，必须用中文编号。');
          parts.push('2. 一级标题用"一、""二、""三、"开头，二级标题用"（一）""（二）""（三）"开头。');
          parts.push('3. 必须按顺序包含以下全部要素，缺一不可：题目 → 摘要 → 关键词 → 一级标题（含二级标题）→ 结语 → 参考文献。');
          parts.push('4. 禁止使用 **粗体**、--- 分隔线等任何 markdown 格式。');
          parts.push('5. 禁止输出任何开场白、寒暄、过渡语（如"好的""以下是为您"等）。');
          parts.push('\n直接输出，格式如下（括号内的文字请替换为实际内容）：');
          parts.push('\n' + paperState.topic);
          parts.push('摘要：此处写200字左右的完整摘要，概述背景、问题和核心观点。不可留空。');
          parts.push('关键词：词1；词2；词3；词4（3-5个具体关键词，分号分隔。不可留空。）');
          parts.push('');
          parts.push('一、一级标题名称');
          parts.push('（一）二级标题名称 —— 一句话简述本节内容');
          parts.push('（二）二级标题名称 —— 一句话简述本节内容');
          parts.push('二、一级标题名称');
          parts.push('（一）二级标题名称 —— 一句话简述本节内容');
          parts.push('……');
          parts.push('四、结语（或五、结语，视大纲结构，但必须有结语）');
          parts.push('参考文献');
          parts.push('1. 作者.文献名[J].期刊名,年份,卷(期):页码');
          parts.push('2. 作者.文献名[J].期刊名,年份,卷(期):页码');
          parts.push('3. 作者.文献名[J].期刊名,年份,卷(期):页码');
          parts.push('\n以上框架中的提示语必须替换为实际内容。一级标题4-6个为宜，结构根据题目灵活设计，前后逻辑自洽。用语谦逊，不夸张。摘要、关键词、结语、参考文献缺一不可。');

        } else if (paperState.stage === 'content') {
          parts.push('请根据以下论文大纲，填充完整的论文内容。');
          parts.push('题目：' + paperState.topic);
          parts.push('大纲：\n' + (paperState.outline || ''));
          parts.push('\n请输出完整的论文正文。字数要求：' + (paperState.wordCount || 4000) + '字左右。');
          parts.push('参考文献需完整列出3-5条，格式为"序号 作者.文献名[J].期刊名,年份,卷(期):页码"。');

        } else if (paperState.stage === 'topics') {
          parts.push('请根据以下研究方向，推荐5个适合发表在学前教育期刊上的论文选题。');
          parts.push('研究方向：' + (input.requirements || paperState.researchDirection || ''));
          parts.push('\n请列出5个选题，每个选题附一句话说明。要求选题具有实践性、创新性，贴近一线教学。');
        }
      } else {
        parts.push('请撰写一篇论文。');
        if (input.topic) parts.push('题目：' + input.topic);
        if (input.requirements) parts.push('要求：' + input.requirements);
        parts.push('\n请直接输出完整的论文内容。');
      }

    } else {
      // 'other' type
      parts.push('请根据以下需求生成内容：');
      if (input.topic) parts.push(input.topic);
      if (input.requirements) parts.push(input.requirements);
      parts.push('\n请直接输出内容。');
    }

    return parts.join('\n');
  },

  /**
   * Build messages specifically for paper topic generation
   */
  buildPaperTopicRequest: function(researchDirection, resourceContext) {
    var system = '你是一位幼儿教育研究方向的专家。请根据用户描述的研究方向，推荐5个适合发表在学前教育期刊上的论文选题。每个选题需要附上一句话的简要说明。选题要求：具有实践价值、一定的新颖性、适合幼儿园一线教师撰写。';

    if (resourceContext) {
      system += '\n\n--- 优秀论文范文参考（请参考其选题方向和标题风格）---\n' + resourceContext;
    }

    var user = '研究方向：' + researchDirection + '\n请列出5个论文选题。';
    return [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];
  }
};
