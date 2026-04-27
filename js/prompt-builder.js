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
      + '语言要求：观察描述客观、准确；分析有理论依据；建议具体可操作。',

    paper: '你是一位幼儿教育领域的资深研究者，具有丰富的学术写作经验。\n'
      + '请根据以下要求，撰写一篇符合期刊发表标准的学术论文。\n'
      + '论文需包含：一、摘要（200字左右） 二、关键词（3-5个）\n'
      + '三、引言（阐述研究背景与意义） 四、现状分析（梳理当前问题）\n'
      + '五、策略与建议（提出具体、有创新性的解决方案） 六、结语\n'
      + '七、参考文献（列出3-5条规范的参考文献）\n'
      + '语言风格：学术化、专业化，论述有据，逻辑严谨，符合期刊发表规范。',

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
      system += '\n\n--- 优秀范文参考（请内化其风格和质量标准）---\n' + resourceContext;
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
      parts.push('\n请直接输出完整的观察记录内容。');

    } else if (type === 'paper') {
      if (paperState) {
        if (paperState.stage === 'outline') {
          parts.push('请为以下论文题目生成一个符合期刊发表要求的大纲：');
          parts.push('题目：' + paperState.topic);
          parts.push('预计字数：' + (paperState.wordCount || 4000) + '字');
          parts.push('\n请输出论文大纲（含各部分标题和简要说明）。');

        } else if (paperState.stage === 'content') {
          parts.push('请根据以下论文大纲，填充完整的论文内容。');
          parts.push('题目：' + paperState.topic);
          parts.push('大纲：\n' + (paperState.outline || ''));
          parts.push('\n请输出完整的论文正文。字数要求：' + (paperState.wordCount || 4000) + '字左右。');

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
  buildPaperTopicRequest: function(researchDirection) {
    var system = '你是一位幼儿教育研究方向的专家。请根据用户描述的研究方向，推荐5个适合发表在学前教育期刊上的论文选题。每个选题需要附上一句话的简要说明。选题要求：具有实践价值、一定的新颖性、适合幼儿园一线教师撰写。';
    var user = '研究方向：' + researchDirection + '\n请列出5个论文选题。';
    return [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];
  }
};
