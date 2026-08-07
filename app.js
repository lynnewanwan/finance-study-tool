const subjects = {
  financial_management: {
    id: "financial_management",
    name: "财务管理",
    eyebrow: "中级会计 · 财务管理",
    intro: "基于 2022-2025 财务管理真题，进入摸底测试、AI动态测试、错题复习和 AI 解题。",
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
  optionOrders: {},
};

const cloudBaseEndpoint = "https://finance-study-ai-d3eve8912af2b1e-1462298552.ap-shanghai.app.tcloudbase.com/explain";
const cloudflareEndpoint = "https://finance-study-ai-proxy.lynnewanwan.workers.dev/";
const isEdgeOneHost = location.hostname.endsWith(".edgeone.cool");
const aiConfig = {
  endpoints: isEdgeOneHost ? ["/api/explain", cloudBaseEndpoint, cloudflareEndpoint] : [cloudBaseEndpoint, cloudflareEndpoint],
  useMock: false,
  timeoutMs: 45000,
};

const els = {
  subjectLanding: document.querySelector("#subjectLanding"),
  appShell: document.querySelector("#appShell"),
  landingSubjectCards: document.querySelector("#landingSubjectCards"),
  upgradeNotice: document.querySelector("#upgradeNotice"),
  dismissUpgradeNotice: document.querySelector("#dismissUpgradeNotice"),
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
  typeBadge: document.querySelector("#typeBadge"),
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

const upgradeNoticeKey = "finance-study-tool-upgrade-notice-v3.0";

function renderUpgradeNotice() {
  if (!els.upgradeNotice) return;
  const dismissed = localStorage.getItem(upgradeNoticeKey) === "dismissed";
  els.upgradeNotice.classList.toggle("hidden", dismissed);
}

function dismissUpgradeNotice() {
  localStorage.setItem(upgradeNoticeKey, "dismissed");
  renderUpgradeNotice();
}

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
    optionOrders: state.optionOrders,
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

function isPracticeAllowed(question) {
  const rules = window.FINANCE_STUDY_QUALITY_RULES || { practiceAllowedStatuses: ["verified", "approved"] };
  const allowed = new Set(rules.practiceAllowedStatuses || ["verified", "approved"]);
  const status = question.status || question.reviewStatus || (question.verified ? "verified" : "approved");
  return allowed.has(status);
}

function shouldShuffleOptions() {
  return state.mode === "practice" || state.mode === "wrong";
}

function displayKeys() {
  return ["A", "B", "C", "D"];
}

function ensureOptionOrder(question) {
  const originalKeys = Object.keys(question.options || {});
  if (!shouldShuffleOptions()) return originalKeys;
  if (!state.optionOrders[question.id]) {
    state.optionOrders[question.id] = shuffle(originalKeys);
    saveDraft();
  }
  return state.optionOrders[question.id].filter((key) => originalKeys.includes(key));
}

function displayedOptions(question) {
  const order = ensureOptionOrder(question);
  return order.reduce((map, originalKey, index) => {
    map[displayKeys()[index]] = {
      originalKey,
      text: question.options[originalKey],
    };
    return map;
  }, {});
}

function normalizeAnswerValue(value) {
  if (Array.isArray(value)) return value.map(String).sort();
  if (typeof value === "string" && value.includes(",")) return value.split(",").map((item) => item.trim()).filter(Boolean).sort();
  return value ? [String(value)] : [];
}

function displayedAnswerKeys(question) {
  const originalAnswers = normalizeAnswerValue(question.answer);
  const options = displayedOptions(question);
  return Object.entries(options)
    .filter(([, value]) => originalAnswers.includes(value.originalKey))
    .map(([key]) => key)
    .sort();
}

function displayedAnswerKey(question) {
  return displayedAnswerKeys(question)[0] || (Array.isArray(question.answer) ? question.answer[0] : question.answer);
}

function displayedAnswerForAi(question) {
  const keys = displayedAnswerKeys(question);
  return isMultipleQuestion(question) ? keys : keys[0] || question.answer;
}

function isMultipleQuestion(question) {
  return question.type === "multiple";
}

function isJudgeQuestion(question) {
  return question.type === "judge";
}

function formatAnswerLabel(answer) {
  const values = Array.isArray(answer) ? answer : normalizeAnswerValue(answer);
  return values.join("、");
}

function questionTypeLabel(question) {
  const labels = {
    single: "单选题",
    multiple: "多选题",
    judge: "判断题",
  };
  return labels[question.type || "single"] || "单选题";
}


function selectedValues() {
  return Array.isArray(state.selected) ? state.selected : state.selected ? [state.selected] : [];
}

function unresolvedDynamicWrongQuestionIds(attempts = loadProgress().attempts) {
  const wrongBookIds = correctedWrongQuestionIds(attempts);
  const dynamicWrongIds = new Set(
    attempts
      .filter((attempt) => attempt.mode === "practice" && !attempt.correct)
      .map((attempt) => attempt.questionId),
  );
  return new Set([...dynamicWrongIds].filter((questionId) => wrongBookIds.has(questionId)));
}

function correctedWrongQuestionIds(attempts = loadProgress().attempts) {
  const byQuestion = new Map();
  for (const attempt of attempts) {
    const list = byQuestion.get(attempt.questionId) || [];
    list.push(attempt);
    byQuestion.set(attempt.questionId, list);
  }
  const wrongIds = new Set();
  for (const [questionId, list] of byQuestion.entries()) {
    let hasWrong = false;
    let correctStreakAfterLastWrong = 0;
    for (const attempt of list) {
      if (!attempt.correct) {
        hasWrong = true;
        correctStreakAfterLastWrong = 0;
      } else if (hasWrong) {
        correctStreakAfterLastWrong += 1;
      }
    }
    if (hasWrong && correctStreakAfterLastWrong < 2) wrongIds.add(questionId);
  }
  return wrongIds;
}

function activeQuestions() {
  const rules = window.FINANCE_STUDY_QUALITY_RULES || { practiceAllowedStatuses: ["verified", "approved"] };
  const allowed = new Set(rules.practiceAllowedStatuses || ["verified", "approved"]);
  return state.questions.filter((question) => {
    const status = question.status || question.reviewStatus || (question.verified ? "verified" : "approved");
    return allowed.has(status);
  });
}

function questionQualitySummary(questions = state.questions) {
  return questions.reduce((summary, question) => {
    const status = question.status || question.reviewStatus || "unknown";
    summary.status[status] = (summary.status[status] || 0) + 1;
    if (question.quality?.issues?.length) {
      summary.issueCount += 1;
    }
    return summary;
  }, { status: {}, issueCount: 0 });
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
      const count = state.allQuestions.filter((question) => (question.subjectId || normalizeSubjectId(question.subject)) === subject.id && isPracticeAllowed(question)).length;
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
renderUpgradeNotice();
exposeV2DeveloperApi();
renderDevQualityPanel();
}

function exportLearningData() {
  const subject = currentSubject();
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: "ai-question-intelligence-v2",
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
  state.optionOrders = {};
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

  const weak = topicStats(attempts).filter((item) => item.wrong > 0);
  const weakItemHtml = (item) => `
    <div class="weak-item">
      <header><strong>${item.topic}</strong><span>${item.wrong}/${item.total} 错</span></header>
      <div class="meter"><i style="width:${Math.max(8, item.weakness * 100)}%"></i></div>
    </div>
  `;
  els.weakList.innerHTML = weak.length
    ? `${weak.slice(0, 5).map(weakItemHtml).join("")}${
        weak.length > 5
          ? `<details class="weak-more"><summary>查看全部 ${weak.length} 个薄弱知识点</summary>${weak.slice(5).map(weakItemHtml).join("")}</details>`
          : ""
      }`
    : `<p class="subtle">完成${currentSubject().name}摸底后，这里会出现需要优先补的知识点。</p>`;
}

function renderBankStats() {
  const labels = {
    official_pdf: "本地真题",
    public_web: "公开网页",
    ai_variant: "AI 变式题",
    mock_exam: "模拟题",
    external_bank: "外部题库",
  };
  const countByOrigin = activeQuestions().reduce((map, question) => {
    map[question.originType] = (map[question.originType] || 0) + 1;
    return map;
  }, {});
  const typeLabels = { single: "单选题", multiple: "多选题", judge: "判断题" };
  const countByType = activeQuestions().reduce((map, question) => {
    const type = question.type || "single";
    map[type] = (map[type] || 0) + 1;
    return map;
  }, {});
  const verified = activeQuestions().filter((question) => (question.status || question.reviewStatus) === "verified" || question.verified).length;
  const rows = Object.entries(countByOrigin).map(
    ([origin, count]) => `<div><span>${labels[origin] || origin}</span><strong>${count} 题</strong></div>`,
  );
  rows.push(...Object.entries(countByType).map(([type, count]) => `<div><span>${typeLabels[type] || type}</span><strong>${count} 题</strong></div>`));
  const summary = questionQualitySummary(state.questions);
  rows.push(`<div><span>已核验/通过</span><strong>${verified} 题</strong></div>`);
  if (summary.issueCount) rows.push(`<div><span>待复核</span><strong>${summary.issueCount} 题</strong></div>`);
  els.bankStats.innerHTML = rows.length ? rows.join("") : `<p class="subtle">题库加载中。</p>`;
}

function pickBalancedQuestions(pool, targetCount = 30) {
  const byTopic = new Map();
  for (const question of shuffle(pool)) {
    const group = byTopic.get(question.topic) || [];
    group.push(question);
    byTopic.set(question.topic, group);
  }
  const balanced = [];
  while (balanced.length < targetCount && [...byTopic.values()].some((group) => group.length)) {
    for (const group of byTopic.values()) {
      if (group.length && balanced.length < targetCount) balanced.push(group.pop());
    }
  }
  return balanced;
}

function pickDiagnostic() {
  const wrongBookIds = correctedWrongQuestionIds();
  const questions = activeQuestions();
  const withoutWrongBook = questions.filter((question) => !wrongBookIds.has(question.id));
  const selected = pickBalancedQuestions(withoutWrongBook, 30);
  if (selected.length >= 30) return selected;
  const selectedIds = new Set(selected.map((question) => question.id));
  const fallback = questions.filter((question) => !selectedIds.has(question.id));
  return [...selected, ...pickBalancedQuestions(fallback, 30 - selected.length)].slice(0, 30);
}

function pickPractice() {
  const attempts = loadProgress().attempts;
  const wrongBookIds = correctedWrongQuestionIds(attempts);
  const dynamicWrongIds = unresolvedDynamicWrongQuestionIds(attempts);
  const excludedIds = new Set([...wrongBookIds, ...dynamicWrongIds]);
  const questions = activeQuestions().filter((question) => !excludedIds.has(question.id));
  const attemptsByQuestion = new Map();
  const attemptsByTopic = new Map();
  const recentByTopic = new Map();
  const sessionOrder = [];
  const sessionSeen = new Set();

  for (const attempt of attempts) {
    attemptsByQuestion.set(attempt.questionId, (attemptsByQuestion.get(attempt.questionId) || 0) + 1);
    const topic = attempt.topic || "未分类";
    const stat = attemptsByTopic.get(topic) || { total: 0, wrong: 0, correct: 0 };
    stat.total += 1;
    stat.correct += attempt.correct ? 1 : 0;
    stat.wrong += attempt.correct ? 0 : 1;
    attemptsByTopic.set(topic, stat);

    const recent = recentByTopic.get(topic) || [];
    recent.push(attempt);
    recentByTopic.set(topic, recent);

    const sessionId = attempt.sessionId || attempt.at || `single-${sessionOrder.length}`;
    if (!sessionSeen.has(sessionId)) {
      sessionSeen.add(sessionId);
      sessionOrder.push(sessionId);
    }
  }

  const wrongIds = new Set(attempts.filter((item) => !item.correct).map((item) => item.questionId));
  const lastTwoSessions = sessionOrder.slice(-2);
  const wrongTopicsByRecentSession = lastTwoSessions.map((sessionId) => {
    const topics = new Set();
    for (const attempt of attempts) {
      if ((attempt.sessionId || attempt.at) === sessionId && !attempt.correct) {
        topics.add(attempt.topic || "未分类");
      }
    }
    return topics;
  });

  const wrongCountTop3 = new Set(
    [...attemptsByTopic.entries()]
      .filter(([, stat]) => stat.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong || b[1].wrong / b[1].total - a[1].wrong / a[1].total)
      .slice(0, 3)
      .map(([topic]) => topic),
  );

  function hasThreeConsecutiveWrong(topic) {
    const recent = recentByTopic.get(topic) || [];
    if (recent.length < 3) return false;
    return recent.slice(-3).every((attempt) => !attempt.correct);
  }

  function missedInLastTwoSessions(topic) {
    if (wrongTopicsByRecentSession.length < 2) return false;
    return wrongTopicsByRecentSession.every((topics) => topics.has(topic));
  }

  function priorityScore(question) {
    const topic = question.topic || "未分类";
    const a = hasThreeConsecutiveWrong(topic);
    const b = missedInLastTwoSessions(topic);
    const c = wrongCountTop3.has(topic);
    const matched = [a, b, c].filter(Boolean).length;
    let score = matched * 100;
    if (a) score += 30;
    if (b) score += 20;
    if (c) score += 10;
    if (wrongIds.has(question.id)) score += 8;
    return score;
  }

  const selected = [];
  const selectedIds = new Set();

  function addFrom(pool, count) {
    for (const question of pool) {
      if (selected.length >= 30 || count <= 0) break;
      if (selectedIds.has(question.id)) continue;
      selected.push(question);
      selectedIds.add(question.id);
      count -= 1;
    }
  }

  const priorityPool = shuffle(questions)
    .map((question) => ({ question, score: priorityScore(question) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.question);
  const unseenPool = shuffle(questions.filter((question) => !attemptsByQuestion.has(question.id)));
  const masteredPool = shuffle(questions.filter((question) => {
    const stat = attemptsByTopic.get(question.topic);
    return stat && stat.total >= 2 && stat.correct / stat.total >= 0.75;
  }));
  const fallbackPool = shuffle(questions);

  addFrom(priorityPool, 20);
  addFrom(unseenPool, 8);
  addFrom(masteredPool, 2);
  addFrom(priorityPool, 30 - selected.length);
  addFrom(fallbackPool, 30 - selected.length);

  return shuffle(selected).slice(0, 30);
}

function pickWrong() {
  const wrongIds = correctedWrongQuestionIds();
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
  state.optionOrders = {};
  els.emptyView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.questionView.classList.remove("hidden");
  els.modeLabel.textContent = `${currentSubject().name} · ${mode === "diagnostic" ? "摸底测试" : mode === "wrong" ? "错题复习" : "AI动态测试"}`;
  els.sessionTitle.textContent = mode === "diagnostic" ? "30 题快速诊断" : mode === "wrong" ? "集中处理错题" : "30 题动态查缺补漏";
  saveDraft();
  renderQuestion();
}

function renderQuestion() {
  const question = state.session[state.current];
  if (!question) return;
  const savedAnswer = state.answers.find((answer) => answer.questionId === question.id);
  state.selected = savedAnswer?.selected || (isMultipleQuestion(question) ? [] : "");
  els.subjectBadge.textContent = question.subject || currentSubject().name;
  els.typeBadge.textContent = questionTypeLabel(question);
  els.typeBadge.dataset.type = question.type || "single";
  els.topicBadge.textContent = question.subtopic ? `${question.topic} · ${question.subtopic}` : question.topic;
  const originLabel = question.originType === "ai_variant" ? "AI 变式题" : question.originType === "public_web" ? "公开题源" : question.originType === "mock_exam" ? "模拟题" : "本地真题";
  const verifyLabel = question.verified ? "已核验" : "待核验";
  els.sourceBadge.textContent = `${question.sourceYear || question.year} · ${originLabel} · ${verifyLabel}`;
  els.questionStem.textContent = question.stem;
  const optionsForDisplay = displayedOptions(question);
  els.options.innerHTML = Object.entries(optionsForDisplay)
    .map(([key, value]) => `<button class="option" data-key="${key}" data-original-key="${value.originalKey}"><b>${key}</b><span>${value.text}</span></button>`)
    .join("");
  els.options.classList.toggle("multiple-options", isMultipleQuestion(question));
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
  const selected = selectedValues().sort();
  if (!question || !selected.length) return;
  const displayedAnswer = displayedAnswerKeys(question).sort();
  const correct = selected.length === displayedAnswer.length && selected.every((key, index) => key === displayedAnswer[index]);
  state.answers = state.answers.filter((answer) => answer.questionId !== question.id);
  const answer = {
    questionId: question.id,
    subjectId: state.subjectId,
    topic: question.topic,
    selected: isMultipleQuestion(question) ? selected : selected[0],
    answer: isMultipleQuestion(question) ? displayedAnswer : displayedAnswer[0],
    originalAnswer: question.answer,
    optionOrder: state.optionOrders[question.id] || Object.keys(question.options || {}),
    mode: state.mode,
    questionType: question.type || "single",
    correct,
  };
  state.answers.push(answer);
  saveDraft();
  renderAnsweredState(question, answer);
  updateProgress();
}

function renderAnsweredState(question, answer) {
  const selected = normalizeAnswerValue(answer.selected);
  const correctAnswers = normalizeAnswerValue(answer.answer);
  for (const button of els.options.querySelectorAll(".option")) {
    const key = button.dataset.key;
    const isSelected = selected.includes(key);
    const isCorrect = correctAnswers.includes(key);
    button.disabled = true;
    if (isSelected) button.classList.add("selected");
    if (isCorrect) button.classList.add("correct");
    if (isSelected && !isCorrect) button.classList.add("wrong");
    if (isSelected && isCorrect) {
      button.classList.add("correct-picked");
      button.dataset.resultLabel = isMultipleQuestion(question) ? "你选对了" : "正确答案";
    } else if (isSelected && !isCorrect) {
      button.classList.add("wrong-picked");
      button.dataset.resultLabel = "你错选了";
    } else if (!isSelected && isCorrect) {
      button.classList.add("missed-correct");
      button.dataset.resultLabel = isMultipleQuestion(question) ? "漏选正确项" : "正确答案";
    }
  }
  els.feedback.classList.remove("hidden");
  const missed = correctAnswers.filter((key) => !selected.includes(key));
  const wronglyPicked = selected.filter((key) => !correctAnswers.includes(key));
  const multipleDetail = isMultipleQuestion(question) && !answer.correct
    ? `<br><span class="answer-detail">正确答案：${formatAnswerLabel(answer.answer)}｜你的答案：${formatAnswerLabel(answer.selected)}${wronglyPicked.length ? `｜错选：${formatAnswerLabel(wronglyPicked)}` : ""}${missed.length ? `｜漏选：${formatAnswerLabel(missed)}` : ""}</span>`
    : "";
  els.feedback.innerHTML = `<strong>${answer.correct ? "答对了" : `答错了，正确答案是 ${formatAnswerLabel(answer.answer)}`}</strong>${multipleDetail}<br>${question.explanation}`;
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
  const questionType = question.type || "single";
  const promptHint = subject.id === "economic_law"
    ? `请按经济法学习方式解释这道${questionTypeLabel(question)}：指出法条关键词、判断路径、例外规则和易混点；同类例题可以是单选题、多选题或判断题。`
    : `请按财务管理学习方式解释这道${questionTypeLabel(question)}：指出公式、变量、判断模型和易错计算口径；同类例题可以是单选题、多选题或判断题。`;
  return {
    subject: question.subject || subject.name,
    subjectId: subject.id,
    aiProfile: subject.aiProfile,
    promptHint,
    topic: question.topic,
    subtopic: question.subtopic || "",
    question: {
      id: question.id,
      type: questionType,
      stem: question.stem,
      options: Object.fromEntries(Object.entries(displayedOptions(question)).map(([key, value]) => [key, value.text])),
      answer: formatAnswerLabel(displayedAnswerForAi(question)),
      explanation: question.explanation,
      sourceYear: question.sourceYear || question.year,
      chapterId: question.chapterId || "",
      sectionId: question.sectionId || "",
      knowledgePointId: question.knowledgePointId || "",
      textbookRefs: question.textbookRefs || [],
      quality: question.quality || {},
      status: question.status || question.reviewStatus || "",
    },
    learnerAnswer: {
      selected: formatAnswerLabel(answer.selected),
      correct: answer.correct,
    },
    outputSchema: {
      knowledgePoint: "string",
      solvingApproach: "string",
      commonMistake: "string",
      example: {
        exampleQuestionType: "single|multiple|judge",
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
  const optionsForDisplay = displayedOptions(question);
  const selectedText = normalizeAnswerValue(answer.selected).map((key) => optionsForDisplay[key]?.text).filter(Boolean).join("；") || "未选择";
  const correctText = normalizeAnswerValue(answer.answer).map((key) => optionsForDisplay[key]?.text).filter(Boolean).join("；") || "";
  if ((question.subjectId || state.subjectId) === "economic_law") {
    return Promise.resolve({
      knowledgePoint: `${question.topic}：先锁定题目考查的法律关系，再判断规则、例外和关键词。`,
      solvingApproach: `本题正确选项是 ${answer.answer}「${correctText}」。对比你选择的 ${answer.selected}「${selectedText}」，重点看题干中的主体、时间、行为效力和例外情形。`,
      commonMistake: answer.correct ? "经济法题答对后也要复盘关键词，很多错项只改一个主体、期限或程序。" : "常见错误是只凭生活经验判断，没有回到法条规则；尤其要警惕“应当/可以/不得/除外”等词。",
      example: buildMockExample(question),
      isMock: true,
    });
  }
  return Promise.resolve({
    knowledgePoint: `${question.topic}：识别题干中的关键变量，先判断考查的是概念、公式还是决策规则。`,
    solvingApproach: `本题应先锁定正确选项 ${answer.answer}。对比你选择的 ${answer.selected}「${selectedText}」和正确项「${correctText}」，再回到原解析中的计算或判断依据。`,
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
      exampleQuestionType: "single",
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
    exampleQuestionType: "single",
    explanation: "财务管理题的第一步是判断考点和模型，再处理计算或概念辨析。直接按数字大小猜选项很容易被干扰项带偏。",
  };
}

function renderAiExplanation(result) {
  const example = result.example || {};
  const exampleType = example.exampleQuestionType || example.type || "single";
  const exampleTypeText = {
    single: "单选题",
    multiple: "多选题",
    judge: "判断题",
  }[exampleType] || "客观题";
  const exampleOptions = Object.entries(example.options || {})
    .map(([key, value]) => `<li><strong>${key}</strong> ${value}</li>`)
    .join("");
  els.aiContent.innerHTML = `
    <div class="ai-block"><strong>核心知识点</strong><span>${result.knowledgePoint}</span></div>
    <div class="ai-block"><strong>解题思路</strong><span>${result.solvingApproach}</span></div>
    <div class="ai-block"><strong>易错提醒</strong><span>${result.commonMistake}</span></div>
    <div class="ai-example">
      <strong>同类例题 · ${exampleTypeText}${result.isMock ? "（mock）" : ""}</strong>
      <p>${example.stem || ""}</p>
      <ol type="A">${exampleOptions}</ol>
      <p><strong>答案：</strong>${formatAnswerLabel(example.answer)}</p>
      <p><strong>解析：</strong>${example.explanation || ""}</p>
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
  const wrong = total - correct;
  const weak = topicStats(state.answers).filter((item) => item.wrong > 0);
  const visibleWeak = weak.slice(0, 8);
  const typeSummary = answerTypeSummary(state.answers);
  els.questionView.classList.add("hidden");
  els.resultView.classList.remove("hidden");
  els.resultTitle.textContent = endedEarly ? "本次作答已保存" : state.mode === "diagnostic" ? "摸底完成" : "本轮练习完成";
  els.resultSummary.innerHTML = `
    <div class="result-card"><strong>${correct}/${total}</strong><span>本轮答对</span>${renderTypeChips(typeSummary, "correct")}</div>
    <div class="result-card"><strong>${wrong}</strong><span>本轮答错</span>${renderTypeChips(typeSummary, "wrong")}</div>
    <div class="result-card"><strong>${total ? Math.round((correct / total) * 100) : 0}%</strong><span>本轮正确率</span>${renderTypeChips(typeSummary, "accuracy")}</div>
    <div class="result-card"><strong>${weak[0]?.topic || "暂无"}</strong><span>优先补强</span></div>
  `;
  els.adviceList.innerHTML = weak.length
    ? `${visibleWeak
        .map((item) => `<li>${item.topic}：本轮错 ${item.wrong} 题，AI动态测试会提高该知识点出现频率。</li>`)
        .join("")}${weak.length > visibleWeak.length ? `<li>还有 ${weak.length - visibleWeak.length} 个薄弱知识点已记录，会在后续动态测试中继续补强。</li>` : ""}`
    : `<li>本轮表现稳定，可以进入AI动态测试，继续扩大题量。</li>`;
  state.current = state.session.length;
  updateProgress();
}

function answerTypeSummary(answers) {
  const labels = {
    single: "单选",
    multiple: "多选",
    judge: "判断",
  };
  return Object.entries(labels).map(([type, label]) => {
    const items = answers.filter((answer) => (answer.questionType || "single") === type);
    const correct = items.filter((answer) => answer.correct).length;
    const total = items.length;
    return {
      type,
      label,
      correct,
      wrong: total - correct,
      total,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
    };
  });
}

function renderTypeChips(summary, metric) {
  const chips = summary
    .filter((item) => item.total > 0)
    .map((item) => {
      const value = metric === "correct"
        ? `${item.correct}/${item.total}`
        : metric === "wrong"
          ? item.wrong
          : `${item.accuracy}%`;
      return `<span>${item.label} ${value}</span>`;
    })
    .join("");
  return chips ? `<div class="result-type-chips">${chips}</div>` : "";
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
  state.optionOrders = draft.optionOrders || {};
  els.emptyView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.questionView.classList.remove("hidden");
  els.modeLabel.textContent = `${currentSubject().name} · ${state.mode === "diagnostic" ? "继续摸底" : state.mode === "wrong" ? "继续错题" : "继续AI动态测试"}`;
  els.sessionTitle.textContent = "继续上次作答";
  renderQuestion();
  return true;
}

if (els.dismissUpgradeNotice) {
  els.dismissUpgradeNotice.addEventListener("click", dismissUpgradeNotice);
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
  const question = state.session[state.current];
  if (isMultipleQuestion(question)) {
    const current = new Set(selectedValues());
    if (current.has(button.dataset.key)) {
      current.delete(button.dataset.key);
      button.classList.remove("selected");
    } else {
      current.add(button.dataset.key);
      button.classList.add("selected");
    }
    state.selected = [...current].sort();
    return;
  }
  state.selected = button.dataset.key;
  for (const item of els.options.querySelectorAll(".option")) item.classList.remove("selected");
  button.classList.add("selected");
});

els.submitAnswer.addEventListener("click", submitAnswer);
els.nextQuestion.addEventListener("click", nextQuestion);
els.explainWithAi.addEventListener("click", explainCurrentQuestion);
els.endSession.addEventListener("click", endSession);


function knowledgePointForQuestion(question) {
  const kb = window.FINANCE_STUDY_KNOWLEDGE_BASE || { subjects: {} };
  const subjectId = question.subjectId || normalizeSubjectId(question.subject);
  const points = kb.subjects?.[subjectId]?.knowledgePoints || [];
  return points.find((point) => point.id === question.knowledgePointId) || null;
}

function buildAiQuestionDraftPayload(questionId, mode = "variant") {
  const question = state.allQuestions.find((item) => item.id === questionId);
  if (!question) throw new Error("找不到对应题目");
  const subject = subjects[question.subjectId] || subjects[normalizeSubjectId(question.subject)];
  const knowledgePoint = knowledgePointForQuestion(question);
  return {
    engineVersion: "2.0-draft",
    taskType: mode === "extension" ? "generate_extension_question" : "generate_variant_question",
    subjectId: subject.id,
    subjectName: subject.name,
    sourceQuestion: {
      id: question.id,
      type: question.type || "single",
      stem: question.stem,
      options: Object.fromEntries(Object.entries(displayedOptions(question)).map(([key, value]) => [key, value.text])),
      answer: displayedAnswerForAi(question),
      explanation: question.explanation,
      originType: question.originType,
      sourceName: question.sourceName,
      sourceYear: question.sourceYear || question.year,
    },
    trustContext: {
      chapterId: question.chapterId,
      sectionId: question.sectionId,
      knowledgePointId: question.knowledgePointId,
      knowledgePointTitle: knowledgePoint?.title || question.subtopic || question.topic,
      textbookRefs: question.textbookRefs || knowledgePoint?.textbookRefs || [],
    },
    outputSchema: {
      id: "string",
      subjectId: "string",
      type: "single",
      stem: "string",
      options: { A: "string", B: "string", C: "string", D: "string" },
      answer: "A|B|C|D",
      explanation: "string",
      chapterId: "string",
      sectionId: "string",
      knowledgePointId: "string",
      originType: "ai_variant|ai_extension",
      status: "needs_review",
      quality: "object",
    },
  };
}

function createMockGeneratedQuestion(questionId, mode = "variant") {
  const payload = buildAiQuestionDraftPayload(questionId, mode);
  const source = payload.sourceQuestion;
  return {
    id: `ai-draft-${source.id}-${Date.now()}`,
    subjectId: payload.subjectId,
    subject: payload.subjectName,
    type: "single",
    stem: `AI草稿：围绕「${payload.trustContext.knowledgePointTitle}」改写本题条件后，下列说法正确的是（ ）。`,
    options: {
      A: "先识别题目所属知识点，再判断规则或模型",
      B: "只需要记住原题答案即可应对所有变式题",
      C: "题干数字、期限或主体变化通常不影响答案",
      D: "AI生成题可以不经过质检直接进入练习",
    },
    answer: "A",
    explanation: "这是本地 mock 草稿，用于验证 v2 生产层数据格式。正式入库前仍需自动质检通过。",
    topic: source.topic || "",
    chapterId: payload.trustContext.chapterId,
    sectionId: payload.trustContext.sectionId,
    knowledgePointId: payload.trustContext.knowledgePointId,
    originType: mode === "extension" ? "ai_extension" : "ai_variant",
    generatedBy: "local_mock_v2",
    variantOf: source.id,
    status: "needs_review",
    reviewStatus: "needs_review",
    quality: {
      knowledgePointExists: Boolean(payload.trustContext.knowledgePointId),
      textbookBasisMatched: Boolean(payload.trustContext.knowledgePointId),
      answerUnique: true,
      duplicateChecked: false,
      numericIntegrity: true,
      passed: false,
      issues: ["ai_draft_needs_validation"],
    },
  };
}

function exposeV2DeveloperApi() {
  window.FinanceStudyV2 = {
    version: "2.0-draft",
    buildAiQuestionDraftPayload,
    createMockGeneratedQuestion,
    qualitySummary: () => questionQualitySummary(state.allQuestions),
    practiceCounts: () => Object.values(subjects).reduce((map, subject) => {
      const all = state.allQuestions.filter((question) => (question.subjectId || normalizeSubjectId(question.subject)) === subject.id);
      map[subject.id] = { total: all.length, practiceReady: all.filter(isPracticeAllowed).length };
      return map;
    }, {}),
  };
}

function renderDevQualityPanel() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("dev") !== "1") return;
  const panel = document.createElement("section");
  panel.className = "dev-quality-panel";
  const kb = window.FINANCE_STUDY_KNOWLEDGE_BASE || { subjects: {} };
  const rules = window.FINANCE_STUDY_QUALITY_RULES || { practiceAllowedStatuses: [] };
  const summary = questionQualitySummary(state.allQuestions);
  const subjectRows = Object.values(subjects).map((subject) => {
    const all = state.allQuestions.filter((q) => (q.subjectId || normalizeSubjectId(q.subject)) === subject.id);
    const usable = all.filter(isPracticeAllowed);
    const issueCount = all.filter((q) => q.quality?.issues?.length).length;
    const kpCount = kb.subjects?.[subject.id]?.knowledgePoints?.length || 0;
    return `<li><strong>${subject.name}</strong>：${usable.length}/${all.length} 题可练，${issueCount} 题待复核，${kpCount} 个知识点。</li>`;
  }).join("");
  panel.innerHTML = `
    <h3>AI Question Intelligence v2.0 质检视图</h3>
    <p>默认练习只使用：${(rules.practiceAllowedStatuses || []).join(" / ") || "verified / approved"}</p>
    <ul>${subjectRows}</ul>
    <p>全库状态：${Object.entries(summary.status).map(([k, v]) => `${k} ${v}`).join("，")}</p>
    <p class="subtle">这个面板只在地址后加 <code>?dev=1</code> 时显示，正式给朋友使用时不会出现。</p>
  `;
  document.body.appendChild(panel);
}

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
