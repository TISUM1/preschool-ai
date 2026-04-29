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

    paper: '你是一位在学前教育领域深耕多年的一线幼儿园教师，同时也是一位善于反思与研究的教育实践者。\n'
      + '你熟悉《3-6岁儿童学习与发展指南》《幼儿园教育指导纲要》等政策文件，\n'
      + '了解当前学前教育研究的热点与趋势，但你从不刻意堆砌理论术语。\n'
      + '你的写作风格是：立足实践、言之有物、逻辑清晰、语气谦逊。\n'
      + '你擅长从日常教学观察中提炼真问题，用朴实的语言讲清楚一件事。\n'
      + '\n'
      + '【格式铁律 — 任何时候都必须遵守】\n'
      + '1. 禁止输出任何寒暄、解释、开场白或结尾语。\n'
      + '   负面示例："好的，根据您的要求……""综上所述……""希望以上内容……"\n'
      + '2. 禁止使用"1. ""2. ""3. "等数字序号作为标题前缀。\n'
      + '3. 禁止输出分隔线（如"---"）或任何装饰性符号。\n'
      + '4. 禁止将"题目""论文题目"等作为独立的章节标题。\n'
      + '5. 一级标题统一用"一、""二、""三、"格式，不额外加粗或标点。\n'
      + '6. 二级标题统一用"（一）""（二）""（三）"格式，括号用中文全角。\n'
      + '\n'
      + '【内容要求】\n'
      + '- 以一线教师的视角写作，避免空泛的政策套话和过度夸张的表述。\n'
      + '- 每一个观点都应能追溯到具体的教学场景或真实问题。\n'
      + '- 如果系统提示词中提供了优秀论文范文，请仔细分析其题目命名方式、\n'
      + '  章节组织逻辑和论证推进方式，内化为自己的框架，而非生硬照搬。\n'
      + '- 大纲结构不必千篇一律，根据题目特点灵活设计，但前后逻辑必须自洽。\n'
      + '- 用语谦逊克制，少用"深刻""重大""开创性"等大词，\n'
      + '  多用"尝试""探讨""思考""初步分析"等务实表述。',

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
          parts.push('请为以下论文题目生成一份详细的论文大纲。');
          parts.push('题目：' + paperState.topic);
          parts.push('预计正文字数：' + (paperState.wordCount || 4000) + '字');
          parts.push('\n【输出格式 — 必须逐字遵守】');
          parts.push('\n你的输出将从以下第一行开始，不要在此之前输出任何文字：');
          parts.push('\n' + paperState.topic);
          parts.push('摘要：（在此写出200字左右的摘要正文，概述研究背景、核心问题和主要观点。必须是完整的句子，不能是占位符）');
          parts.push('关键词：（在此列出3-5个具体关键词，用分号分隔，如"家园共育；幼儿社会性发展；教育策略"）');
          parts.push('');
          parts.push('一、[一级标题名称]');
          parts.push('（一）[二级标题名称] —— 1-2句话说明本小节打算写什么');
          parts.push('（二）[二级标题名称] —— 1-2句话说明本小节打算写什么');
          parts.push('二、[一级标题名称]');
          parts.push('（一）[二级标题名称] —— 1-2句话说明本小节打算写什么');
          parts.push('……');
          parts.push('\n【关键提醒】');
          parts.push('- 不要输出上述格式说明文字本身（如"[一级标题名称]"），而是替换为实际内容。');
          parts.push('- 摘要和关键词必须写出具体内容，不能用"此处写摘要"之类的占位文本。');
          parts.push('- 大纲的一级标题数量不限（建议4-6个），每个一级标题下至少有1个二级标题。');
          parts.push('- 系统提示词中可能提供了优秀论文范文，请分析其章节结构和论证逻辑，');
          parts.push('  内化为自己的框架，而非照搬。结构应根据本题目的特点灵活设计。');
          parts.push('- 论证推进要有逻辑：提出问题 → 分析原因 → 给出策略 → 总结反思。');
          parts.push('- 每个二级标题后的说明要具体，体现一线教师对教学实践的深入思考。');

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
