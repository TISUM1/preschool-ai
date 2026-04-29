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

    // 1b. Inject teacher identity for paper type
    if (type === 'paper') {
      var teacherName = AppSettings.getTeacherName();
      if (teacherName && teacherName !== '计老师') {
        system = system.replace('你是一线幼儿园教师', '你是' + teacherName + '，一位一线幼儿园教师');
      }
    }

    // 2. Resource library context (auto-injected)
    // For paper type, use fuller context (2000 chars) for stronger style signal
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
        system += '\n\n--- 个人写作样本（请模仿其用词习惯、句式节奏和论证方式）---\n' + resourceContext;
      } else {
        system += '\n\n--- 优秀论文范文（请仔细学习以下范文的题目命名、章节结构和论证逻辑，务必参考其框架）---\n' + resourceContext;
      }
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
          // Inject personal material if provided
          if (paperState.personalMaterial) {
            parts.push('\n【个人实践素材 — 必须融入论文正文】');
            parts.push('以下是作者的真实教学经历和观察数据，请将其自然地融入论文的相关章节中（可改写措辞但保留事实和数据）：');
            parts.push(paperState.personalMaterial);
          }

        } else if (paperState.stage === 'polish') {
          parts.push('你是一位深耕学前教育领域的资深一线教师，兼具教育叙事研究与反AIGC检测的经验。');
          parts.push('请对以下论文初稿进行深度改写润色，使其同时通过传统查重检测和AIGC检测，并完整保留学前教育实践者的话语质感。\n');
          parts.push('【改写规则 — 逐条执行】');
          parts.push('1. 消除连续文本重复：确保改写后不出现连续8个以上相同字符的重合。从用词、句式到叙事结构进行多层重构，严禁浅层换皮。');
          parts.push('2. 对抗AIGC检测：');
          parts.push('   - 控制困惑度：避免AI偏好的通用措辞（如"促进幼儿全面发展"），改用现场感表达（如"在反复摆弄中，孩子自己摸到了门道"）。');
          parts.push('   - 制造突发性：插入即兴的个人反思（"我忽然意识到……""这让我联想到一次失败的尝试……"），长短句交错，打破AI均匀节奏。');
          parts.push('   - 注入人味：使用"我蹲下来问……""说实话，当时我拿不准……""或许可以这样理解……"等含不确定性和现场感的句式。');
          parts.push('3. 词汇领域化替换："帮助"→"支架/鹰架"，"玩"→"探索/摆弄"，"教"→"引发/助推"，"观察"→"定睛观察/沉浸式观察"，"环境"→"有准备的环境/邀请性环境"。');
          parts.push('4. 句式重构：视角切换（"教师发现"→"透过……我注意到"），长句拆解嵌入师幼对话片段，主动被动交替，倒装带入场景。');
          parts.push('5. 篇章重构（螺旋式叙事反思）：将平铺直叙重组为"现场白描→即时困惑→尝试性介入→幼儿反应→再反思与理论对照→可迁移经验"弧线。');
          parts.push('6. 去模板化：删除"综上所述""由此可见""首先…其次…再次…"等AI常用语，用自然过渡替代（"随之带来的变化是……""这让我想起……"）。');
          parts.push('7. 语言指纹个性化：多使用"我逐渐意识到……""这一现象或许暗含着……""在后续跟踪观察中，我修正了最初判断……"等谦逊开放措辞。');
          parts.push('   偶尔插入口语化短评（"这招很灵""孩子根本不理会我的预设"），制造长短句落差和真实感。');
          parts.push('\n【禁止事项】');
          parts.push('- 禁止改变论文核心论点和逻辑结构');
          parts.push('- 禁止删减章节或大幅改变字数');
          parts.push('- 禁止添加原文没有的新观点');
          parts.push('- 保持中文编号格式不变');
          parts.push('- 学前领域术语（最近发展区、鹰架/支架、图式、同化/顺应、关键经验、学习故事、安吉游戏、自主游戏、表征、师幼互动、DAP等）必须原样保留');
          parts.push('- 引文标记、观察日期、统计数据绝对不改');
          parts.push('\n请输出润色后的完整论文：\n');
          parts.push(paperState.content || '');

        } else if (paperState.stage === 'rewrite') {
          parts.push('请用你自己的语言重新表达以下论文内容。要求：');
          parts.push('1. 保持所有论点、数据和结构不变');
          parts.push('2. 用完全不同的措辞和句式重新组织每一段');
          parts.push('3. 保持学术论文的严谨性，但表达方式要与你日常写作风格一致');
          parts.push('4. 不要逐句翻译式改写，而是理解段落后重新论述');
          parts.push('5. 增加第一人称叙述，减少"本文"等通用学术口吻');
          parts.push('6. 学前领域专业术语保持不变');
          parts.push('\n请输出改写后的完整论文：\n');
          parts.push(paperState.content || '');

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
