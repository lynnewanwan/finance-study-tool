const subjects = {
  financial_management: {
    id: "financial_management",
    name: "财务管理",
    eyebrow: "中级会计 · 财务管理",
    intro: "基于 2022-2025 财务管理真题单选题，进入摸底测试、薄弱点强化、错题复习和 AI 解题。",
    storageKey: "finance-study-tool-v1:financial_management",
    legacyStorageKey: "finance-study-tool-v1",
    aiProfile: "financial_management",
    topics: ["财务管理基础", "预算管理", "筹资管理", "投资管理", "营运资金管理", "成本管理", "收入与分配管理", "财务分析与评价", "其他综合"],
  },
  economic_law: {
    id: "economic_law",
    name: "经济法",
    eyebrow: "中级会计 · 经济法",
    intro: "按 2026 教材目录组织知识树，基于历年真题单选题进行摸底和错题复习。",
    storageKey: "finance-study-tool-v1:economic_law",
    aiProfile: "economic_law",
    topics: ["总论", "公司法律制度", "合伙企业法律制度", "物权法律制度", "合同法律制度", "金融法律制度", "财政法律制度", "其他综合"],
  },
};

const state = {
  allQuestions: [],
  questions: [],
  subjectId: "",
  session: [],
  current: 0,
  selected: "",
  answers: [],
  mode: "idle",
  sessionId: "",
};

const cloudBaseEndpoint = "https://finance-study-ai-d3eve8912af2b1e-1462298552.ap-shanghai.app.tcloudbase.com/explain";
const cloudflareEndpoint = "https://finance-study-ai-proxy.lynnewanwan.workers.dev/";
const isEdgeOneHost = location.hostname.endsWith(".edgeone.cool");
const aiConfig = {
  endpoints: isEdgeOneHost ? ["/api/explain", cloudBaseEndpoint, cloudflareEndpoint] : [cloudBaseEndpoint, cloudflareEndpoint],
  useMock: false,
  timeoutMs: 20000,
};

const els = {
  subjectLanding: document.querySelector("#subjectLanding"),
  appShell: document.querySelector("#appShell"),
  landingSubjectCards: document.querySelector("#landingSubjectCards"),
  backToSubjects: document.querySelector("#backToSubjects"),
  subjectEyebrow: document.querySelector("#subjectEyebrow"),
  appTitle: document.querySelector("#appTitle"),
  subjectIntro: document.querySelector("#subjectIntro"),
  migrationNotice: document.querySelector("#migrationNotice"),
  migrateLegacyData: document.querySelector("#migrateLegacyData"),
  totalDone: document.querySelector("#totalDone"),
  accuracy: document.querySelector("#accuracy"),
  bankStats: document.querySelector("#bankStats"),
  weakList: document.querySelector("#weakList"),
  startDiagnostic: document.querySelector("#startDiagnostic"),
  startPractice: document.querySelector("#startPractice"),
  reviewWrong: document.querySelector("#reviewWrong"),
  exportData: document.querySelector("#exportData"),
  resetData: document.querySelector("#resetData"),
  modeLabel: document.querySelector("#modeLabel"),
  sessionTitle: document.querySelector("#sessionTitle"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  questionView: document.querySelector("#questionView"),
  emptyView: document.querySelector("#emptyView"),
  resultView: document.querySelector("#resultView"),
  subjectBadge: document.querySelector("#subjectBadge"),
  topicBadge: document.querySelector("#topicBadge"),
  sourceBadge: document.querySelector("#sourceBadge"),
  questionStem: document.querySelector("#questionStem"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  aiPanel: document.querySelector("#aiPanel"),
  explainWithAi: document.querySelector("#explainWithAi"),
  aiContent: document.querySelector("#aiContent"),
  endSession: document.querySelector("#endSession"),
  submitAnswer: document.querySelector("#submitAnswer"),
  nextQuestion: document.querySelector("#nextQuestion"),
  resultTitle: document.querySelector("#resultTitle"),
  resultSummary: document.querySelector("#resultSummary"),
  adviceList: document.querySelector("#adviceList"),
};

function currentSubject() {
  return subjects[state.subjectId] || subjects.financial_management;
}

function storageKey() {
  return currentSubject().storageKey;
}

const migrationVersion = "dual-subject-v1";

function migrationKey(subject) {
  return `${subject.storageKey}:migrationVersion`;
}

function migrateLegacyProgress() {
  const subject = currentSubject();
  if (!subject.legacyStorageKey) return;
  const key = migrationKey(subject);
  if (localStorage.getItem(key) === migrationVersion) return;
  const legacy = localStorage.getItem(subject.legacyStorageKey);
  const current = localStorage.getItem(subject.storageKey);
  if (legacy && !current) {
    localStorage.setItem(subject.storageKey, legacy);
  }
  localStorage.setItem(key, migrationVersion);
}

function hasLegacyProgressToMigrate() {
  const subject = currentSubject();
  if (!subject.legacyStorageKey) return false;
  const legacy = localStorage.getItem(subject.legacyStorageKey);
  if (!legacy) return false;
  const current = loadProgressForSubject(subject);
  return !current.attempts?.length && !current.activeSession;
}

function renderMigrationNotice() {
  if (!els.migrationNotice) return;
  els.migrationNotice.classList.toggle("hidden", !hasLegacyProgressToMigrate());
}

function migrateLegacyDataManually() {
  const subject = currentSubject();
  if (!subject.legacyStorageKey) return;
  const legacy = localStorage.getItem(subject.legacyStorageKey);
  if (!legacy) {
    alert("没有检测到旧版记录。");
    renderMigrationNotice();
    return;
  }
  const current = loadProgressForSubject(subject);
  if ((current.attempts?.length || 0) > 0 || current.activeSession) {
    alert("当前科目已经有学习记录，为避免覆盖，未执行迁移。");
    renderMigrationNotice();
    return;
  }
  localStorage.setItem(subject.storageKey, legacy);
  localStorage.setItem(migrationKey(subject), migrationVersion);
  renderSidebar();
  renderMigrationNotice();
  alert("旧版财务管理记录已迁移。");
}

function loadProgress() {
  migrateLegacyProgress();
  try {
    return JSON.parse(localStorage.getItem(storageKey())) || { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function saveProgress(progress) {
  localStorage.setItem(storageKey(), JSON.stringify(progress));
}

function loadDraft() {
  return loadProgress().activeSession || null;
}

function clearDraft() {
  const progress = loadProgress();
  delete progress.activeSession;
  saveProgress(progress);
}

function saveDraft() {
  const progress = loadProgress();
  progress.activeSession = {
    id: state.sessionId,
    subjectId: state.subjectId,
    mode: state.mode,
    questionIds: state.session.map((question) => question.id),
    current: state.current,
    answers: state.answers,
    updatedAt: new Date().toISOString(),
  };
  saveProgress(progress);
}

function commitSession() {
  if (!state.answers.length) {
    clearDraft();
    renderSidebar();
    return;
  }
  const progress = loadProgress();
  const submittedAt = new Date().toISOString();
  const sessionId = state.sessionId || `session-${Date.now()}`;
  const committedIds = new Set(
    progress.attempts
      .filter((attempt) => attempt.sessionId === sessionId)
      .map((attempt) => attempt.questionId),
  );
  const attempts = state.answers
    .filter((answer) => !committedIds.has(answer.questionId))
    .map((answer) => ({ ...answer, subjectId: state.subjectId, sessionId, at: submittedAt }));
  progress.attempts.push(...attempts);
  delete progress.activeSession;
  saveProgress(progress);
  renderSidebar();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function activeQuestions() {
  return state.questions;
}

function topicStats(attempts = loadProgress().attempts) {
  const map = new Map();
  for (const item of attempts) {
    const stat = map.get(item.topic) || { topic: item.topic, total: 0, wrong: 0 };
    stat.total += 1;
    stat.wrong += item.correct ? 0 : 1;
    map.set(item.topic, stat);
  }
  return [...map.values()]
    .map((item) => ({ ...item, weakness: item.total ? item.wrong / item.total : 0 }))
    .sort((a, b) => b.weakness - a.weakness || b.total - a.total);
}

function renderSubjectCards() {
  els.landingSubjectCards.innerHTML = Object.values(subjects)
    .map((subject) => {
      const count = state.allQuestions.filter((question) => (question.subjectId || normalizeSubjectId(question.subject)) === subject.id).length;
      const progress = loadProgressForSubject(subject).attempts || [];
      const draft = loadProgressForSubject(subject).activeSession;
      const total = progress.length;
      const correct = progress.filter((item) => item.correct).length;
      const accuracy = total ? `${Math.round((correct / total) * 100)}%` : "尚未开始";
      return `<button class="landing-subject-card" data-subject="${subject.id}">
        <span class="card-eyebrow">${subject.eyebrow}</span>
        <strong>${subject.name}</strong>
        <span class="card-desc">${subject.intro}</span>
      </button>`;
    })
    .join("");
}

function loadProgressForSubject(subject) {
  try {
    return JSON.parse(localStorage.getItem(subject.storageKey)) || { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function normalizeSubjectId(subjectName) {
  if (subjectName === "经济法") return "economic_law";
  return "financial_management";
}

function applySubject(subjectId, options = {}) {
  const nextSubjectId = subjects[subjectId] ? subjectId : "financial_management";
  state.subjectId = nextSubjectId;
  localStorage.setItem("finance-study-current-subject", state.subjectId);
  state.questions = state.allQuestions.filter((question) => (question.subjectId || normalizeSubjectId(question.subject)) === state.subjectId);
  resetSessionView();
  renderSidebar();
  renderMigrationNotice();
  const subject = currentSubject();
  els.subjectLanding.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  els.subjectEyebrow.textContent = subject.eyebrow;
  els.appTitle.textContent = `${subject.name}刷题诊断台`;
  els.subjectIntro.textContent = subject.intro;
  els.modeLabel.textContent = subject.eyebrow;
  els.sessionTitle.textContent = `${subject.name}：选择一个练习模式`;
  if (!resumeDraft()) {
    els.emptyView.classList.remove("hidden");
  }
}

function showSubjectLanding() {
  if (state.subjectId && loadDraft()) {
    const ok = confirm("当前科目有未完成作答，返回科目选择不会删除草稿。确认返回？");
    if (!ok) return;
  }
  resetSessionView();
  state.subjectId = "";
  state.questions = [];
  els.appShell.classList.add("hidden");
  els.subjectLanding.classList.remove("hidden");
  renderSubjectCards();
}

function exportLearningData() {
  const subject = currentSubject();
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: "dual-subject-v1",
    subjectId: subject.id,
    subjectName: subject.name,
    storageKey: subject.storageKey,
    progress: loadProgress(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `中级会计-${subject.name}-学习记录-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetSessionView() {
  state.session = [];
  state.current = 0;
  state.answers = [];
  state.selected = "";
  state.mode = "idle";
  state.sessionId = "";
  els.questionView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.emptyView.classList.remove("hidden");
  updateProgress();
}

function renderSidebar() {
  const attempts = loadProgress().attempts;
  const total = attempts.length;
  const correct = attempts.filter((item) => item.correct).length;
  els.totalDone.textContent = total;
  els.accuracy.textContent = total ? `${Math.round((correct / total) * 100)}%` : "-";
  renderBankStats();

  const weak = topicStats(attempts).filter((item) => item.wrong > 0).slice(0, 5);
  els.weakList.innerHTML = weak.length
    ? weak
        .map(
          (item) => `
          <div class="weak-item">
            <header><strong>${item.topic}</strong><span>${item.wrong}/${item.total} 错</span></header>
            <div class="meter"><i style="width:${Math.max(8, item.weakness * 100)}%"></i></div>
          </div>
        `,
        )
        .join("")
    : `<p class="subtle">完成${currentSubject().name}摸底后，这里会出现需要优先补的知识点。</p>`;
}

function renderBankStats() {
  const labels = {
    official_pdf: "本地真题",
    public_web: "公开网页",
    ai_variant: "AI 变式题",
  };
  const countByOrigin = activeQuestions().reduce((map, question) => {
    map[question.originType] = (map[question.originType] || 0) + 1;
    return map;
  }, {});
  const verified = activeQuestions().filter((question) => question.verified).length;
  const rows = Object.entries(countByOrigin).map(
    ([origin, count]) => `<div><span>${labels[origin] || origin}</span><strong>${count} 题</strong></div>`,
  );
  rows.push(`<div><span>已核验</span><strong>${verified} 题</strong></div>`);
  els.bankStats.innerHTML = rows.length ? rows.join("") : `<p class="subtle">题库加载中。</p>`;
}

function pickDiagnostic() {
  const byTopic = new Map();
  for (const question of shuffle(activeQuestions())) {
    const group = byTopic.get(question.topic) || [];
    group.push(question);
    byTopic.set(question.topic, group);
  }
  const balanced = [];
  while (balanced.length < 30 && [...byTopic.values()].some((group) => group.length)) {
    for (const group of byTopic.values()) {
      if (group.length && balanced.length < 30) balanced.push(group.pop());
    }
  }
  return balanced;
}

function pickPractice() {
  const attempts = loadProgress().attempts;
  const weakTopics = topicStats(attempts)
    .filter((item) => item.wrong > 0)
    .slice(0, 3)
    .map((item) => item.topic);
  const wrongIds = new Set(attempts.filter((item) => !item.correct).map((item) => item.questionId));
  const weighted = activeQuestions().flatMap((question) => {
    const weight = (weakTopics.includes(question.topic) ? 4 : 1) + (wrongIds.has(question.id) ? 3 : 0);
    return Array.from({ length: weight }, () => question);
  });
  const seen = new Set();
  return shuffle(weighted)
    .filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    })
    .slice(0, 20);
}

function pickWrong() {
  const wrongIds = new Set(loadProgress().attempts.filter((item) => !item.correct).map((item) => item.questionId));
  return shuffle(activeQuestions().filter((question) => wrongIds.has(question.id))).slice(0, 20);
}

function startSession(mode, questions) {
  if (!questions.length) {
    alert("当前科目暂时没有可练习题目。");
    return;
  }
  if (loadDraft() && !confirm("当前有未完成作答，开始新练习会覆盖上次进度。确认继续？")) return;
  clearDraft();
  state.mode = mode;
  state.session = questions;
  state.current = 0;
  state.answers = [];
  state.selected = "";
  state.sessionId = `session-${Date.now()}`;
  els.emptyView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.questionView.classList.remove("hidden");
  els.modeLabel.textContent = `${currentSubject().name} · ${mode === "diagnostic" ? "摸底测试" : mode === "wrong" ? "错题复习" : "强化练习"}`;
  els.sessionTitle.textContent = mode === "diagnostic" ? "30 题快速诊断" : mode === "wrong" ? "集中处理错题" : "薄弱点优先训练";
  saveDraft();
  renderQuestion();
}

function renderQuestion() {
  const question = state.session[state.current];
  if (!question) return;
  const savedAnswer = state.answers.find((answer) => answer.questionId === question.id);
  state.selected = savedAnswer?.selected || "";
  els.subjectBadge.textContent = question.subject || currentSubject().name;
  els.topicBadge.textContent = question.subtopic ? `${question.topic} · ${question.subtopic}` : question.topic;
  const originLabel = question.originType === "ai_variant" ? "AI 变式题" : question.originType === "public_web" ? "公开题源" : "本地真题";
  const verifyLabel = question.verified ? "已核验" : "待核验";
  els.sourceBadge.textContent = `${question.sourceYear || question.year} · ${originLabel} · ${verifyLabel}`;
  els.questionStem.textContent = question.stem;
  els.options.innerHTML = Object.entries(question.options)
    .map(([key, value]) => `<button class="option" data-key="${key}"><b>${key}</b><span>${value}</span></button>`)
    .join("");
  els.feedback.classList.add("hidden");
  els.feedback.innerHTML = "";
  resetAiPanel();
  els.submitAnswer.classList.remove("hidden");
  els.nextQuestion.classList.add("hidden");
  if (savedAnswer) {
    renderAnsweredState(question, savedAnswer);
  }
  updateProgress();
}

function updateProgress() {
  const total = state.session.length;
  const done = Math.min(state.answers.length, total);
  els.progressText.textContent = `${done} / ${total}`;
  els.progressBar.style.width = total ? `${(done / total) * 100}%` : "0";
}

function submitAnswer() {
  const question = state.session[state.current];
  if (!question || !state.selected) return;
  const correct = state.selected === question.answer;
  state.answers = state.answers.filter((answer) => answer.questionId !== question.id);
  const answer = { questionId: question.id, subjectId: state.subjectId, topic: question.topic, selected: state.selected, answer: question.answer, correct };
  state.answers.push(answer);
  saveDraft();
  renderAnsweredState(question, answer);
  updateProgress();
}

function renderAnsweredState(question, answer) {
  for (const button of els.options.querySelectorAll(".option")) {
    const key = button.dataset.key;
    button.disabled = true;
    if (key === answer.selected) button.classList.add("selected");
    if (key === question.answer) button.classList.add("correct");
    if (key === answer.selected && !answer.correct) button.classList.add("wrong");
  }
  els.feedback.classList.remove("hidden");
  els.feedback.innerHTML = `<strong>${answer.correct ? "答对了" : `答错了，正确答案是 ${question.answer}`}</strong><br>${question.explanation}`;
  els.aiPanel.classList.remove("hidden");
  els.submitAnswer.classList.add("hidden");
  els.nextQuestion.classList.remove("hidden");
}

function resetAiPanel() {
  els.aiPanel.classList.add("hidden");
  els.explainWithAi.disabled = false;
  els.explainWithAi.textContent = "生成 AI 解题";
  els.aiContent.innerHTML = `<p class="subtle">答题后可生成知识点、解题思路、易错提醒和同类例题。</p>`;
}

function currentAnsweredQuestion() {
  const question = state.session[state.current];
  const answer = state.answers.find((item) => item.questionId === question?.id);
  return question && answer ? { question, answer } : null;
}

function buildAiPayload(question, answer) {
  const subject = subjects[question.subjectId] || currentSubject();
  const promptHint = subject.id === "economic_law"
    ? "请按经济法学习方式解释：指出法条关键词、判断路径、例外规则和易混点；同类例题用小案例单选题。"
    : "请按财务管理学习方式解释：指出公式、变量、判断模型和易错计算口径；同类例题保持单选题。";
  return {
    subject: question.subject || subject.name,
    subjectId: subject.id,
    aiProfile: subject.aiProfile,
    promptHint,
    topic: question.topic,
    subtopic: question.subtopic || "",
    question: {
      id: question.id,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      sourceYear: question.sourceYear || question.year,
    },
    learnerAnswer: {
      selected: answer.selected,
      correct: answer.correct,
    },
    outputSchema: {
      knowledgePoint: "string",
      solvingApproach: "string",
      commonMistake: "string",
      example: {
        stem: "string",
        options: { A: "string", B: "string", C: "string", D: "string" },
        answer: "string",
        explanation: "string",
      },
    },
  };
}

async function explainCurrentQuestion() {
  const current = currentAnsweredQuestion();
  if (!current) return;
  const { question, answer } = current;
  els.explainWithAi.disabled = true;
  els.explainWithAi.textContent = "生成中...";
  els.aiContent.innerHTML = `<p class="subtle">正在整理这道题的知识点和同类例题。</p>`;
  try {
    const result = aiConfig.useMock
      ? await mockAiExplanation(question, answer)
      : await requestAiExplanation(buildAiPayload(question, answer));
    renderAiExplanation(result);
    els.explainWithAi.textContent = "重新生成";
  } catch (error) {
    els.aiContent.innerHTML = `<p class="subtle">AI 解题暂时不可用：${error.message}</p>`;
    els.explainWithAi.textContent = "重试";
  } finally {
    els.explainWithAi.disabled = false;
  }
}

async function requestAiExplanation(payload) {
  const endpoints = aiConfig.endpoints?.length ? aiConfig.endpoints : [aiConfig.endpoint].filter(Boolean);
  if (!endpoints.length) {
    throw new Error("尚未配置代理地址");
  }
  const errors = [];
  for (const endpoint of endpoints) {
    try {
      return await fetchAiEndpoint(endpoint, payload);
    } catch (error) {
      errors.push(`${endpoint}: ${error.message}`);
    }
  }
  throw new Error(`AI 代理暂时无法访问。${errors.join("；")}`);
}

async function fetchAiEndpoint(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiConfig.timeoutMs || 20000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`请求失败：${response.status}${detail ? `，${detail.slice(0, 120)}` : ""}`);
    }
    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("请求超时，请检查当前网络是否能访问 AI 代理");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mockAiExplanation(question, answer) {
  const selectedText = question.options[answer.selected] || "未选择";
  const correctText = question.options[question.answer] || "";
  if ((question.subjectId || state.subjectId) === "economic_law") {
    return Promise.resolve({
      knowledgePoint: `${question.topic}：先锁定题目考查的法律关系，再判断规则、例外和关键词。`,
      solvingApproach: `本题正确选项是 ${question.answer}「${correctText}」。对比你选择的 ${answer.selected}「${selectedText}」，重点看题干中的主体、时间、行为效力和例外情形。`,
      commonMistake: answer.correct ? "经济法题答对后也要复盘关键词，很多错项只改一个主体、期限或程序。" : "常见错误是只凭生活经验判断，没有回到法条规则；尤其要警惕“应当/可以/不得/除外”等词。",
      example: buildMockExample(question),
      isMock: true,
    });
  }
  return Promise.resolve({
    knowledgePoint: `${question.topic}：识别题干中的关键变量，先判断考查的是概念、公式还是决策规则。`,
    solvingApproach: `本题应先锁定正确选项 ${question.answer}。对比你选择的 ${answer.selected}「${selectedText}」和正确项「${correctText}」，再回到原解析中的计算或判断依据。`,
    commonMistake: answer.correct
      ? "这题答对后也要留意题干限定条件，类似题常通过改变年份、比例、最低收益率或税率制造干扰。"
      : "易错点通常在于只看表面数字，没有先判断题目所属模型，或把相近概念、公式口径混用。",
    example: buildMockExample(question),
    isMock: true,
  });
}

function buildMockExample(question) {
  if ((question.subjectId || state.subjectId) === "economic_law") {
    return {
      stem: `同类例题：围绕「${question.topic}」设置一个小案例，下列说法正确的是（ ）。`,
      options: {
        A: "先识别主体和法律行为，再判断规则是否适用",
        B: "只要当事人协商一致，所有限制性规定均可排除",
        C: "题干出现期限时，一律从合同签订日开始计算",
        D: "经济法题只需要记结论，不需要看例外规则",
      },
      answer: "A",
      explanation: "经济法题通常先看主体、行为、时间和程序，再判断法律规则及例外。",
    };
  }
  return {
    stem: `同类例题：围绕「${question.topic}」重新设置条件后，下列说法正确的是（ ）。`,
    options: {
      A: "先识别题目考查模型，再代入相应公式或规则",
      B: "只要数字接近，就可以直接选择最大或最小的选项",
      C: "解析中的限制条件通常可以忽略",
      D: "所有财务管理题都只能通过背诵概念作答",
    },
    answer: "A",
    explanation: "财务管理题的第一步是判断考点和模型，再处理计算或概念辨析。直接按数字大小猜选项很容易被干扰项带偏。",
  };
}

function renderAiExplanation(result) {
  const exampleOptions = Object.entries(result.example.options)
    .map(([key, value]) => `<li><strong>${key}</strong> ${value}</li>`)
    .join("");
  els.aiContent.innerHTML = `
    <div class="ai-block"><strong>核心知识点</strong><span>${result.knowledgePoint}</span></div>
    <div class="ai-block"><strong>解题思路</strong><span>${result.solvingApproach}</span></div>
    <div class="ai-block"><strong>易错提醒</strong><span>${result.commonMistake}</span></div>
    <div class="ai-example">
      <strong>同类例题${result.isMock ? "（mock）" : ""}</strong>
      <p>${result.example.stem}</p>
      <ol type="A">${exampleOptions}</ol>
      <p><strong>答案：</strong>${result.example.answer}</p>
      <p><strong>解析：</strong>${result.example.explanation}</p>
    </div>
  `;
}

function nextQuestion() {
  state.current += 1;
  if (state.current >= state.session.length) {
    finishSession();
  } else {
    saveDraft();
    renderQuestion();
  }
}

function finishSession() {
  commitSession();
  showResult(false);
}

function endSession() {
  if (!state.answers.length) {
    if (!confirm("本次还没有已提交答案，确认结束？")) return;
  } else if (!confirm("确认结束本次作答并保存已完成题目？")) {
    return;
  }
  commitSession();
  showResult(true);
}

function showResult(endedEarly) {
  const correct = state.answers.filter((item) => item.correct).length;
  const total = state.answers.length;
  const weak = topicStats(state.answers).filter((item) => item.wrong > 0).slice(0, 3);
  els.questionView.classList.add("hidden");
  els.resultView.classList.remove("hidden");
  els.resultTitle.textContent = endedEarly ? "本次作答已保存" : state.mode === "diagnostic" ? "摸底完成" : "本轮练习完成";
  els.resultSummary.innerHTML = `
    <div class="result-card"><strong>${correct}/${total}</strong><span>本轮答对</span></div>
    <div class="result-card"><strong>${total ? Math.round((correct / total) * 100) : 0}%</strong><span>本轮正确率</span></div>
    <div class="result-card"><strong>${weak[0]?.topic || "暂无"}</strong><span>优先补强</span></div>
  `;
  els.adviceList.innerHTML = weak.length
    ? weak
        .map((item) => `<li>${item.topic}：本轮错 ${item.wrong} 题，下一轮会提高该知识点出现频率。</li>`)
        .join("")
    : `<li>本轮表现稳定，可以进入薄弱点强化，继续扩大题量。</li>`;
  state.current = state.session.length;
  updateProgress();
}

function resumeDraft() {
  const draft = loadDraft();
  if (!draft?.questionIds?.length) return false;
  const questionById = new Map(activeQuestions().map((question) => [question.id, question]));
  const questions = draft.questionIds.map((id) => questionById.get(id)).filter(Boolean);
  if (!questions.length) {
    clearDraft();
    return false;
  }
  state.mode = draft.mode || "diagnostic";
  state.session = questions;
  state.current = Math.min(draft.current || 0, questions.length - 1);
  state.answers = Array.isArray(draft.answers) ? draft.answers : [];
  state.selected = "";
  state.sessionId = draft.id || `session-${Date.now()}`;
  els.emptyView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.questionView.classList.remove("hidden");
  els.modeLabel.textContent = `${currentSubject().name} · ${state.mode === "diagnostic" ? "继续摸底" : state.mode === "wrong" ? "继续错题" : "继续强化"}`;
  els.sessionTitle.textContent = "继续上次作答";
  renderQuestion();
  return true;
}

els.landingSubjectCards.addEventListener("click", (event) => {
  const card = event.target.closest(".landing-subject-card");
  if (!card) return;
  applySubject(card.dataset.subject);
});

els.backToSubjects.addEventListener("click", showSubjectLanding);
els.migrateLegacyData.addEventListener("click", migrateLegacyDataManually);

els.options.addEventListener("click", (event) => {
  const button = event.target.closest(".option");
  if (!button || button.disabled) return;
  state.selected = button.dataset.key;
  for (const item of els.options.querySelectorAll(".option")) item.classList.remove("selected");
  button.classList.add("selected");
});

els.submitAnswer.addEventListener("click", submitAnswer);
els.nextQuestion.addEventListener("click", nextQuestion);
els.explainWithAi.addEventListener("click", explainCurrentQuestion);
els.endSession.addEventListener("click", endSession);
els.startDiagnostic.addEventListener("click", () => startSession("diagnostic", pickDiagnostic()));
els.startPractice.addEventListener("click", () => startSession("practice", pickPractice()));
els.exportData.addEventListener("click", exportLearningData);

els.reviewWrong.addEventListener("click", () => {
  const questions = pickWrong();
  if (questions.length) startSession("wrong", questions);
  else alert(`当前还没有${currentSubject().name}错题。`);
});
els.resetData.addEventListener("click", () => {
  if (confirm(`确认清空${currentSubject().name}本地答题记录？`)) {
    localStorage.removeItem(storageKey());
    resetSessionView();
    renderSidebar();
    renderMigrationNotice();
  }
});

function initializeQuestions(questions) {
  state.allQuestions = questions.map((question) => ({
    ...question,
    subjectId: question.subjectId || normalizeSubjectId(question.subject),
  }));
  renderSubjectCards();
  els.subjectLanding.classList.remove("hidden");
  els.appShell.classList.add("hidden");
}

if (Array.isArray(window.FINANCE_STUDY_QUESTIONS)) {
  initializeQuestions(window.FINANCE_STUDY_QUESTIONS);
} else {
  fetch("./questions.json")
    .then((response) => response.json())
    .then(initializeQuestions)
    .catch((error) => {
      els.landingSubjectCards.innerHTML = `<p class="subtle">题库加载失败：${error.message}。如果是本地预览，请确认 questions-data.js 与 index.html 在同一目录。</p>`;
    });
}
