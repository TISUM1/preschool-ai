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

    other: '你是一位多才多艺的教育工作者，能够根据用户需求生成各种类型的教育相关内容。\n'
      + '请根据用户的具体要求生成内容。语言风格和格式请根据内容类型灵活调整。',

    story: '你是一位深耕学前教育一线的教师，擅长撰写课程故事和学习故事。\n'
      + '你善于从日常教学现场捕捉有价值的片段，用白描手法还原幼儿的真实行为和对话，再从中提炼课程意义与教育启示。\n'
      + '\n'
      + '课程故事需包含以下结构：\n'
      + '一、故事背景（活动场景、幼儿群体、课程缘起）\n'
      + '二、故事现场（用白描手法客观还原幼儿行为，保留幼儿原话和具体动作细节，有画面感）\n'
      + '三、教师回应（描述教师的即时判断与介入方式，体现"何时支架、何时退后"的思考）\n'
      + '四、幼儿发展（幼儿在介入后的变化与成长，用具体行为佐证）\n'
      + '五、反思与启示（从课程价值、儿童观、师幼互动等角度提炼可迁移的经验）\n'
      + '\n'
      + '语言要求：叙事生动有画面感，像在给同事讲一个真实发生的故事；分析克制不拔高，有一分证据说一分话；保留幼儿原话和具体行为细节，不概括化。\n'
      + '如果提供了具体学生信息，请在课程故事中结合该学生的个性特点和行为习惯，使故事更加真实具体。'
  },

  /**
   * Build the complete messages array for API call
   */
  buildMessages: async function(type, context) {
    context = context || {};
    var messages = [];

    // 1. System prompt
    var system = this.systemPrompts[type] || this.systemPrompts.other;

    // 2. Resource library context (auto-injected)
    var resourceContext = context.resourceContext;
    if (!resourceContext) {
      resourceContext = await ResourceLibrary.getContextForType(type);
    }
    if (resourceContext) {
      system += '\n\n--- 优秀范文参考 ---\n' + resourceContext;
    }

    // 3. Template content (current session reference)
    if (context.templateContents && context.templateContents.length > 0) {
      system += '\n\n--- 本次撰写的参考文件 ---\n';
      for (var i = 0; i < context.templateContents.length; i++) {
        var tc = context.templateContents[i];
        var content = tc.content || '';
        var plain = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        system += '\n参考文件' + (i + 1) + '：《' + tc.fileName + '》\n' + plain + '\n';
      }
      if (context.matchFormat) {
        system += '\n请严格按照上述参考文件的格式框架输出。';
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

    } else if (type === 'story') {
      parts.push('请生成一份课程故事。');
      if (input.topic) parts.push('故事主题：' + input.topic);
      if (input.ageGroup) parts.push('年龄段：' + input.ageGroup);
      if (input.requirements) parts.push('具体要求：' + input.requirements);
      if (input.studentContext) parts.push('\n学生信息：\n' + input.studentContext);
      parts.push('\n请直接输出完整的课程故事内容。故事要有画面感，保留幼儿原话和具体行为细节。');

    } else {
      parts.push('请根据以下需求生成内容：');
      if (input.topic) parts.push(input.topic);
      if (input.requirements) parts.push(input.requirements);
      parts.push('\n请直接输出内容。');
    }

    return parts.join('\n');
  },

  /**
   * Build messages for paper topic generation
   */
  buildPaperTopicRequest: function(researchDirection, resourceContext) {
    var system = '你是一位学前教育领域的学术选题专家，熟悉《学前教育研究》《幼儿教育》《早期教育》等核心期刊的选题方向和发表标准。\n\n'
      + '请根据用户描述的研究方向，推荐5个适合发表在学前教育核心期刊上的论文选题。\n\n'
      + '【选题六大特征——必须借鉴】\n\n'
      + '特征一：原点反思——直击课堂"假性繁荣"\n'
      + '这类题目撕开一个大家习以为常、实则问题严重的教学现象。用一个带引号的词精准概括痛点，然后给出破解方向。\n'
      + '示例：《"虚假繁荣"之后：小学语文课堂"假性合作讨论"的识别与破解》《"刷题依赖"的破局：小学数学教学中"元认知"能力培养的路径探索》\n\n'
      + '特征二：概念创新——自创一个有说服力的"词"\n'
      + '从实践中"长"出来的原创框架概念，不是因为高级才被记住，而是因为精准。\n'
      + '示例：《"三阶九步"：小学中高年级"实用性阅读与交流"任务群教学范式》《"自然材料游戏场"：幼儿园低结构材料的创意玩法与深度学习》\n\n'
      + '特征三：跨界融合——在学科"夹缝"中找火花\n'
      + '打破学科壁垒，在交叉地带创造新可能，找到两个学科之间的"焊接点"。\n'
      + '示例：《"科普小品文"读写结合项目：在语言建构中培养科学精神》《"史"与"文"的对话：初中历史人物传记的跨学科阅读与写作》\n\n'
      + '特征四：技术赋能——让AI、VR"为我所用"\n'
      + '紧跟技术前沿但解决教学真问题，技术是手段不是目的。\n'
      + '示例：《创意表达：ChatGPT时代习作教学的路径探寻》《AR技术支持下幼儿主题探究活动的实践研究》\n\n'
      + '特征五：循证诊断——用"数据"代替"我觉得"\n'
      + '借鉴医学循证理念，用调查、测试、个案追踪来说话，拿出证据证明"确实有效"。\n'
      + '示例：《小学三年级学生"写作畏难情绪"的成因调查与阶梯式消解策略》《五年级学生"分数概念"迷思点的诊断测试与概念转变教学研究》\n\n'
      + '特征六：冷门掘金——关注"被遗忘的角落"\n'
      + '关注边缘群体、被忽视的问题，于冷僻处见温度。\n'
      + '示例：《"隐形留守"儿童的心理需求与关怀策略》《为"读写障碍"倾向学生提供课堂支持性资源的实践探索》\n\n'
      + '【选题要求】\n'
      + '1. 须具有理论价值与实践意义\n'
      + '2. 选题须具体明确，包含研究对象或问题，避免泛泛而谈\n'
      + '3. 必须借鉴上述六大特征中的至少2-3个特征来构思选题\n'
      + '4. 适合学前教育研究者撰写，须有学术深度\n'
      + '5. 每个选题附一句话说明其研究价值，并标注借鉴了哪些特征';

    if (resourceContext) {
      system += '\n\n--- 权威期刊论文范本参考（请参考其选题方向和标题风格）---\n' + resourceContext;
    }

    var user = '研究方向：' + researchDirection + '\n请列出5个论文选题。';
    return [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ];
  }
};