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
          parts.push('6. 去模板化：删除"综上所述""总而言之""不可否认"等AI高频用语');
          parts.push('\n【突发性注入——必须执行】');
          parts.push('1. 句长变异：相邻两句字数差应≥10字。禁止连续3句长度相近（±5字内）。');
          parts.push('2. 段落节奏：论证段落8-15句，过渡段落2-4句。禁止所有段落长度相近。');
          parts.push('3. 论证节奏变异：有的段落"观点→引用→深化"，有的"现象→反问→自答→引证"，有的直接以引用开头再展开。禁止全文使用同一论证节奏。');
          parts.push('4. 偶尔插入短句断言（5-8字）作为段落收束，如"质言之，主体性不可让渡。""诚然，此路维艰。"');
          parts.push('\n【困惑度提升——必须执行】');
          parts.push('1. 低频词注入：每段至少使用1个学前教育领域低频但准确的术语（如：具身性、发生学、谱系学、现象学、诠释学、场域、惯习、实践感、互为主体性、符号互动、生态心理学、分布式认知、文化历史活动理论）。');
          parts.push('2. 意外搭配：允许并鼓励非常规但合理的词语搭配（如"知识的共构""意义的协商""实践的纹理""经验的褶皱"）。');
          parts.push('3. 禁止连续使用概率最高的下一个词——如果某个词感觉"最自然"，尝试换一个稍意外但同样准确的词。');
          parts.push('\n【禁止事项】');
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
          parts.push('7. 确保段落间逻辑衔接紧密，使用"质言之""然而""诚然""由此可见"等学术连接语。');
          parts.push('\n【词汇分布扰动——必须执行】');
          parts.push('1. 术语聚集：将某些专业术语集中在1-2个段落密集使用（一段出现3-4次），其他段落不出现或仅出现1次。禁止全文均匀分布每个术语。');
          parts.push('2. 连接词不均匀：某段多用"然而""诚然"等转折词，另一段多用"质言之""进言之"等推进词，另一段几乎不用连接词。禁止每段都用相同的连接词组合。');
          parts.push('3. 引用密度变异：有的段落2-3处引用，有的段落0处引用（纯论证段），有的段落1处引用。禁止每段引用数量相近。');
          parts.push('\n【深层语义重构——必须执行】');
          parts.push('1. 不是逐句改写，而是：读完一个自然段→理解核心论证→用完全不同的切入点重新论述。');
          parts.push('2. 如果原文从A角度论证，改写时从B角度论证同一论点（如原文从政策角度，改写从儿童发展角度；原文从理论推导，改写从实践反推）。');
          parts.push('3. 允许调整论据顺序：原文"论点→论据A→论据B"，可改为"论据B→论点→论据A"或"设问→论据A→论据B→论点"。');
          parts.push('\n【禁止事项】');
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
   * Perturbation instructions pool for paragraph-level rewriting
   */
  perturbationPool: [
    '本段必须包含一个反问句',
    '本段必须以短句断言结尾（8字以内）',
    '本段必须使用一个学前教育领域低频术语（如具身性、发生学、谱系学、现象学、诠释学、惯习、实践感、互为主体性、符号互动、分布式认知等）',
    '本段禁止使用任何连接词（然而、因此、质言之、进言之等）',
    '本段必须包含一句15字以上的长复合句',
    '本段必须以引用标注[数字]开头',
    '本段必须包含一个让步转折（"诚然…但…"）',
    '本段必须使用一个意外但准确的词语搭配（如"知识的共构""意义的协商""实践的纹理"等）',
    '本段论证节奏必须是：设问→自答→引证',
    '本段禁止出现"重要""有效""需要"三个词',
    '本段必须包含一个破折号插入语',
    '本段必须以具体案例或数据开头',
    '本段必须使用被动语态改写主动句',
    '本段必须包含一个括号注释说明',
    '本段论证节奏必须是：引证→质疑→深化',
    '本段必须包含一个数据或比例表述（如"超过六成""近三分之一"等）',
    '本段必须以问句开头',
    '本段禁止使用"的"字超过3次，用其他结构替代',
    '本段必须包含一处破折号插入和一处括号注释',
    '本段必须将至少一个长句（20字以上）拆分为两个短句',
    '本段必须使用一个学前教育领域英文术语并附中文注释',
    '本段论证节奏必须是：数据呈现→问题提炼→归因分析',
    '本段必须包含一个与学前教育政策文件的直接对应引用（如"《指南》明确指出""《纲要》强调"等）'
  ],

  /**
   * Build messages for paragraph-level perturbation rewriting
   */
  buildPerturbPrompt: function(paragraph, perturbation) {
    var system = '你是一位学前教育领域的学术编辑。你将收到论文中的一个段落，请对其进行改写。\n\n'
      + '【改写规则】\n'
      + '1. 保持该段的核心论点和学术含义不变\n'
      + '2. 保持第三人称客观学术语气\n'
      + '3. 保持引用标注[1][2][3]不变\n'
      + '4. 必须执行下方【扰动指令】中的要求\n'
      + '5. 改写后的段落字数与原文相近（±20%）\n'
      + '6. 用词和句式必须与原文显著不同——如果原文用A词，你必须用B词；如果原文是主动句，你用被动句；如果原文是长句，你拆成短句\n\n'
      + '【扰动指令】' + perturbation + '\n\n'
      + '请直接输出改写后的段落，不要输出任何解释。';

    return [
      { role: 'system', content: system },
      { role: 'user', content: paragraph }
    ];
  },

  /**
   * Checklists for self-verification at each stage
   */
  checklists: {
    outline: '1. 是否包含题目？\n'
      + '2. 是否包含摘要（200-300字，使用"本文"第三人称）？\n'
      + '3. 是否包含关键词（3-5个，分号分隔）？\n'
      + '4. 正文是否使用中文编号（一、二、三 →（一）（二）（三）→ 1. 2. 3.）？\n'
      + '5. 各级标题是否陈述论点而非命名话题？\n'
      + '6. 每个二级标题后是否附有简述？\n'
      + '7. 是否包含结语？\n'
      + '8. 是否包含参考文献（15-25条，GB/T 7714格式）？\n'
      + '9. 是否使用了markdown格式符号？（不应有）\n'
      + '10. 是否有开场白？（不应有）',

    content: '1. 是否全程使用第三人称？（无"我""我们""我认为"等第一人称）\n'
      + '2. 正文中是否有引用标注[1][2][3]？\n'
      + '3. 是否使用中文编号体系？\n'
      + '4. 各级标题是否陈述论点而非命名话题？\n'
      + '5. 引言是否从宏观政策或社会背景切入？\n'
      + '6. 论证是否有理论支撑和引用？\n'
      + '7. 是否包含结语？\n'
      + '8. 文末是否有完整参考文献列表（GB/T 7714格式）？\n'
      + '9. 是否有口语化表达或感叹句？（不应有）\n'
      + '10. 是否有"综上所述""总而言之"等AI套话？（不应有）',

    polish: '1. 是否全程使用第三人称？（无第一人称）\n'
      + '2. 是否消除了"首先…其次…最后…"等模板化排列？\n'
      + '3. 段落长短是否有变化？（不应全部相近）\n'
      + '4. 是否替换了AI高频词（"重要""有效""需要"等）？\n'
      + '5. 是否有句长变异？（相邻句字数差≥10字）\n'
      + '6. 是否有低频术语注入？\n'
      + '7. 是否有短句断言收束？\n'
      + '8. 引用标注是否保留？\n'
      + '9. 核心论点是否未改变？\n'
      + '10. 是否无口语化表达？',

    rewrite: '1. 是否全程使用第三人称？\n'
      + '2. 引用标注[1][2][3]是否保留？\n'
      + '3. 参考文献列表是否完整保留？\n'
      + '4. 术语是否聚集而非均匀分布？\n'
      + '5. 连接词是否不均匀分布？\n'
      + '6. 引用密度是否有变异？\n'
      + '7. 是否有深层语义重构（非逐句改写）？\n'
      + '8. 核心论点是否未改变？\n'
      + '9. 章节是否未删除或合并？\n'
      + '10. 是否无口语化表达？'
  },

  /**
   * Build messages for self-verification at each stage
   */
  buildCheckPrompt: function(stage, content, checklist) {
    var system = '你是一位严谨的学术论文质检编辑。你将收到一份论文文本和一份检查清单。\n'
      + '请逐条核对检查清单中的每一项：\n'
      + '- 如果符合要求，标注"✓ 通过"\n'
      + '- 如果不符合要求，直接在文本中修改使其符合，然后标注"✗ 已修正：[修改内容]"\n\n'
      + '核对完毕后，输出修改后的完整文本。\n'
      + '格式：先逐条输出核对结果，然后输出"---完整文本---"，最后输出修改后的完整论文。\n\n'
      + '【检查清单】\n' + checklist;

    return [
      { role: 'system', content: system },
      { role: 'user', content: content }
    ];
  },

  /**
   * Build messages for verify-only check (no full-text regeneration)
   * Used after polish/rewrite stages to avoid re-homogenizing anti-detection work
   */
  buildVerifyPrompt: function(stage, content, checklist) {
    var system = '你是一位严格的学术论文质检员。你将收到一份论文文本和一份检查清单。\n'
      + '请逐条核对检查清单中的每一项：\n'
      + '- 如果符合要求，输出：第N项：通过\n'
      + '- 如果不符合要求，输出：第N项：不通过——[问题描述]——修正：将"原文片段"改为"修正片段"\n\n'
      + '【关键规则】\n'
      + '- 绝对不要重新输出或改写完整论文\n'
      + '- 修正必须是局部的：只指出需要替换的原文片段和替换后的文本\n'
      + '- 修正必须最小化：只改需要改的部分\n'
      + '- 如果某项通过，不要建议任何修改\n\n'
      + '【检查清单】\n' + checklist;

    return [
      { role: 'system', content: system },
      { role: 'user', content: content }
    ];
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