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

    paper: '你是一位深耕学前教育领域的学术研究者，在《学前教育研究》《幼儿教育》等核心期刊发表过多篇论文。你擅长撰写符合学术规范的期刊论文，行文严谨、论证有力。\n\n'
      + '【核心规范——必须严格遵守】\n'
      + '1. 人称：全程使用第三人称/客观学术语气。使用"本文""本研究""研究者""笔者"等指代，绝不使用"我""我们""我认为""我尝试"等第一人称表述。\n'
      + '2. 引用：正文中必须穿插引用标注，格式为[1][2][3]，与文末参考文献对应。每段至少1-2处引用，全文引用不少于20处。\n'
      + '3. 编号：使用中文编号体系——一、二、三（一级标题）→（一）（二）（三）（二级标题）→ 1. 2. 3.（三级标题）。不使用阿拉伯数字做一级标题。\n'
      + '4. 语言：正式学术书面语，避免口语化表达。使用学前教育领域专业术语（如：鹰架、最近发展区、主体性、具身认知、生态效度、师幼互动、游戏精神等）。过渡词使用"质言之""进言之""诚然""然而""由此可见"等学术连接语。\n'
      + '5. 开头：从宏观政策文件、国家战略或社会现象切入，逐步聚焦到本文要探讨的具体问题，阐明研究意义。\n'
      + '6. 标题风格：各级标题应陈述论点而非命名话题。例如，不用"现实困境"而用"认知处于混沌状态，教师对创客教育的理解多停留于概念复述水平"；不用"优化策略"而用"以尊重为基石，激发幼儿参与的内驱力"。'
      + '\n\n【结构规范】\n'
      + '根据论文类型选择对应结构：\n'
      + '- 理论概念型：问题提出 → 核心概念/理论框架 → 现状审思/困境分析 → 实践进路/路径重构 → 结语\n'
      + '- 实证量化型：问题提出 → 文献综述/研究假设 → 研究方法 → 研究结果 → 讨论 → 结论与建议\n'
      + '- 实践路径型：价值意蕴/内涵特征 → 现实困境/问题审视 → 实践路径/优化策略 → 结语'
      + '\n\n【禁止事项】\n'
      + '- 禁止使用"我""我们""我认为""我觉得""我尝试""我发现"等第一人称\n'
      + '- 禁止使用"综上所述""总而言之"等AI常用套话\n'
      + '- 禁止口语化表达和感叹句\n'
      + '- 禁止无引用的断言，观点必须有文献支撑',

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
      if (type === 'paper') {
        resourceContext = await ResourceLibrary.getFullContextForType(type, 2000);
      } else {
        resourceContext = await ResourceLibrary.getContextForType(type);
      }
    }
    if (resourceContext) {
      if (type === 'paper') {
        system += '\n\n--- 权威期刊论文范本（请模仿其用词习惯、句式节奏、论证方式和标题风格）---\n' + resourceContext;
      } else {
        system += '\n\n--- 优秀范文参考 ---\n' + resourceContext;
      }
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

    // 4. Style samples for polish/rewrite stages
    if (context.styleSamples) {
      system += '\n\n--- 风格范本（请仔细体会其文笔、用词习惯、断句节奏、标点使用方式和论证节奏，在精修/校准时模仿这些特征）---\n' + context.styleSamples;
    }

    messages.push({ role: 'system', content: system });

    // 5. User prompt
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

    } else if (type === 'paper') {
      if (paperState) {
        if (paperState.stage === 'outline') {
          parts.push('请为以下学前教育学术论文生成详细大纲。\n');
          parts.push('【题目】' + paperState.topic);
          parts.push('【字数】约' + (paperState.wordCount || 4000) + '字\n');
          parts.push('【大纲要求】');
          parts.push('1. 根据题目判断论文类型（理论概念型/实证量化型/实践路径型），选择对应结构');
          parts.push('2. 使用中文编号：一、二、三 →（一）（二）（三）→ 1. 2. 3.');
          parts.push('3. 各级标题应陈述论点而非命名话题。例如，不用"现实困境"而用"认知处于混沌状态"；不用"优化策略"而用"以尊重为基石，激发幼儿参与的内驱力"');
          parts.push('4. 每个二级标题后附一句话简述该节将论述的核心内容');
          parts.push('5. 大纲应体现"提出问题→分析问题→解决问题"的逻辑链');
          parts.push('6. 必须包含：题目、摘要（200-300字，使用"本文"第三人称）、关键词（3-5个，分号分隔）、结语、参考文献（15-25条，GB/T 7714格式）');
          parts.push('7. 禁止使用 markdown 格式符号，禁止输出开场白\n');
          parts.push('请直接输出大纲。');

        } else if (paperState.stage === 'content') {
          parts.push('请根据以下论文大纲，填充完整的论文内容。\n');
          parts.push('【题目】' + paperState.topic);
          parts.push('【大纲】\n' + (paperState.outline || ''));
          parts.push('【字数】约' + (paperState.wordCount || 4000) + '字\n');
          parts.push('【写作要求】');
          parts.push('1. 全文使用第三人称客观学术语气，绝不使用"我""我们"等第一人称');
          parts.push('2. 正文中穿插引用标注[1][2][3]等，文末附完整参考文献列表（GB/T 7714格式，15-25条）');
          parts.push('3. 标题使用中文编号：一、二、三 →（一）（二）（三）→ 1. 2. 3.');
          parts.push('4. 各级标题应陈述论点而非命名话题');
          parts.push('5. 引言从宏观政策或社会背景切入，逐步聚焦到本文研究问题');
          parts.push('6. 论证过程要有理论支撑，每个观点都需引用相关文献');
          parts.push('7. 结语简要总结核心观点，指出研究局限与未来方向');
          parts.push('8. 语言风格参照《学前教育研究》等核心期刊论文\n');
          if (paperState.personalMaterial) {
            parts.push('【个人实践素材】以下是作者的真实教学经历和观察数据，请将其转化为客观的第三人称学术表述融入论文（将"我观察到"改写为"研究者在观察中发现"或"教学实践表明"），保留事实和数据：\n');
            parts.push(paperState.personalMaterial);
          }

        } else if (paperState.stage === 'polish') {
          parts.push('你是一位学前教育核心期刊的资深审稿编辑，擅长在保持学术规范的前提下对论文进行精修，消除AI生成痕迹，使文本更接近真人学者的写作风格。\n');
          parts.push('【精修规则】');
          parts.push('1. 人称红线：绝不引入第一人称（"我""我们"）。如原文出现第一人称，必须改为"本文""本研究""研究者""笔者"等第三人称表述。');
          parts.push('2. 消除AI痕迹：');
          parts.push('   - 打破AI句式规律：避免连续使用"首先…其次…最后…"等模板化排列，改用递进、转折、因果等自然衔接');
          parts.push('   - 调整段落节奏：真人论文段落长短不一，论证段落较长，过渡段落较短；AI倾向于均匀段落，需打破');
          parts.push('   - 替换AI高频词："重要"→"关键/核心/根本"，"有效"→"切实/显著/卓有成效"，"需要"→"亟待/务必/理应"');
          parts.push('   - 消除连续8字以上重复，进行深层语义重构');
          parts.push('3. 模仿范本特征：参照风格范本中的用词习惯、断句节奏、标点使用方式和论证节奏');
          parts.push('4. 词汇领域化替换：帮助→鹰架/支架，玩→探索/游戏，教→引发/促进，环境→场域/生态，问题→困境/症结，方法→路径/策略');
          parts.push('5. 句式重构：主动被动交替、嵌入条件/让步/因果等复合句式');
          parts.push('6. 去模板化：删除"综上所述""总而言之""不可否认"等AI高频用语\n');
          parts.push('【禁止事项】');
          parts.push('- 禁止引入任何第一人称');
          parts.push('- 禁止改变核心论点和文章结构');
          parts.push('- 禁止删减章节或添加新观点');
          parts.push('- 禁止修改专业术语和数据');
          parts.push('- 禁止使用口语化表达\n');
          parts.push('请输出精修后的完整论文：\n');
          parts.push(paperState.content || '');

        } else if (paperState.stage === 'rewrite') {
          parts.push('你是一位学前教育领域的学术写作专家，请对以下论文进行跨模型校准——用完全不同的措辞重新表达，同时模仿真人学者的写作风格。\n');
          parts.push('【校准要求】');
          parts.push('1. 人称红线：全程保持第三人称客观学术语气，绝不使用"我""我们""我认为"等第一人称。如原文出现，必须改为"本文""本研究""研究者""笔者"。');
          parts.push('2. 保持论点、数据、结构和引用标注[1][2][3]不变，参考文献列表不变。');
          parts.push('3. 深层语义重构：理解每段的核心论证后重新论述，不逐句翻译式改写。用完全不同的措辞和句式表达相同含义。');
          parts.push('4. 模仿范本特征：参照风格范本中的用词习惯、断句节奏、标点使用方式和论证节奏');
          parts.push('5. 增加学术论证深度：补充理论依据、政策引用等支撑性内容。');
          parts.push('6. 学前教育领域专业术语保持不变（鹰架、最近发展区、主体性、具身认知等）。');
          parts.push('7. 确保段落间逻辑衔接紧密，使用"质言之""然而""诚然""由此可见"等学术连接语。\n');
          parts.push('【禁止事项】');
          parts.push('- 禁止引入第一人称');
          parts.push('- 禁止改变文章核心论点');
          parts.push('- 禁止删除或合并章节');
          parts.push('- 禁止使用口语化表达和感叹句\n');
          parts.push('请输出校准后的完整论文：\n');
          parts.push(paperState.content || '');

        } else if (paperState.stage === 'topics') {
          parts.push('请根据以下研究方向，推荐5个适合发表在学前教育核心期刊上的论文选题。\n');
          parts.push('选题要求：');
          parts.push('1. 须具有理论价值与实践意义');
          parts.push('2. 选题须具体明确，包含研究对象或问题');
          parts.push('3. 优先考虑以下选题模式：');
          parts.push('   - "XX的价值意蕴、现实困境与实践路径"');
          parts.push('   - "基于XX视角/视域的YY研究"');
          parts.push('   - "XX对YY的影响/作用——ZZ的中介/调节效应"');
          parts.push('4. 每个选题附一句话说明其研究价值\n');
          parts.push('研究方向：' + (input.requirements || paperState.researchDirection || ''));
        }
      } else {
        parts.push('请撰写一篇学前教育领域的学术论文。');
        if (input.topic) parts.push('题目：' + input.topic);
        if (input.requirements) parts.push('要求：' + input.requirements);
        parts.push('\n请直接输出完整的论文内容。');
      }

    } else {
      parts.push('请根据以下需求生成内容：');
      if (input.topic) parts.push(input.topic);
      if (input.requirements) parts.push(input.requirements);
      parts.push('\n请直接输出内容。');
    }

    return parts.join('\n');
  },

  /**
   * Get style samples from resource library for polish/rewrite stages
   */
  getStyleSamples: async function() {
    try {
      var resources = await ResourceLibrary.getResources('paper');
      if (!resources || resources.length === 0) return '';

      // Pick up to 3 resources randomly
      var shuffled = resources.slice().sort(function() { return Math.random() - 0.5; });
      var selected = shuffled.slice(0, 3);

      var samples = '';
      for (var i = 0; i < selected.length; i++) {
        var r = selected[i];
        var text = r.extractedText || '';
        // Take a 400-char snippet from the middle of the text
        if (text.length > 400) {
          var start = Math.floor(text.length * 0.2);
          text = text.substring(start, start + 400);
        }
        if (text.trim()) {
          samples += '\n【范本' + (i + 1) + '：《' + r.fileName + '》】\n' + text.trim() + '\n';
        }
      }
      return samples.trim();
    } catch(e) {
      return '';
    }
  },

  /**
   * Build messages specifically for paper topic generation
   */
  buildPaperTopicRequest: function(researchDirection, resourceContext) {
    var system = '你是一位学前教育领域的学术研究专家，熟悉《学前教育研究》《幼儿教育》《早期教育》等核心期刊的选题方向和发表标准。\n\n'
      + '请根据用户描述的研究方向，推荐5个适合发表在学前教育核心期刊上的论文选题。\n\n'
      + '选题要求：\n'
      + '1. 须具有理论价值与实践意义\n'
      + '2. 选题须具体明确，包含研究对象或问题，避免泛泛而谈\n'
      + '3. 优先考虑以下选题模式：\n'
      + '   - "XX的价值意蕴、现实困境与实践路径"\n'
      + '   - "基于XX视角/视域的YY研究"\n'
      + '   - "XX对YY的影响/作用——ZZ的中介/调节效应"\n'
      + '   - "XX的内涵特征、现实审视与优化策略"\n'
      + '4. 适合学前教育研究者撰写，须有学术深度\n'
      + '5. 每个选题附一句话说明其研究价值';

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