const state = {
  questions: [],
  session: [],
  current: 0,
  selected: "",
  answers: [],
  mode: "idle",
  sessionId: "",
};

const storageKey = "finance-study-tool-v1";
const aiConfig = {
  endpoint: "https://finance-study-ai-proxy.lynnewanwan.workers.dev/",
  useMock: false,
};

const els = {
  totalDone: document.querySelector("#totalDone"),
  accuracy: document.querySelector("#accuracy"),
  bankStats: document.querySelector("#bankStats"),
  weakList: document.querySelector("#weakList"),
  startDiagnostic: document.querySelector("#startDiagnostic"),
  startPractice: document.querySelector("#startPractice"),
  reviewWrong: document.querySelector("#reviewWrong"),
  resetData: document.querySelector("#resetData"),
  modeLabel: document.querySelector("#modeLabel"),
  sessionTitle: document.querySelector("#sessionTitle"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  questionView: document.querySelector("#questionView"),
  emptyView: document.querySelector("#emptyView"),
  resultView: document.querySelector("#resultView"),
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

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function saveProgress(progress) {
  localStorage.setItem(storageKey, JSON.stringify(progress));
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
    .map((answer) => ({ ...answer, sessionId, at: submittedAt }));
  progress.attempts.push(...attempts);
  delete progress.activeSession;
  saveProgress(progress);
  renderSidebar();
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
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
    : `<p class="subtle">完成摸底后，这里会出现需要优先补的知识点。</p>`;
}

function renderBankStats() {
  const labels = {
    official_pdf: "本地真题",
    public_web: "公开网页",
    ai_variant: "AI 变式题",
  };
  const countByOrigin = state.questions.reduce((map, question) => {
    map[question.originType] = (map[question.originType] || 0) + 1;
    return map;
  }, {});
  const verified = state.questions.filter((question) => question.verified).length;
  const rows = Object.entries(countByOrigin).map(
    ([origin, count]) => `<div><span>${labels[origin] || origin}</span><strong>${count} 题</strong></div>`,
  );
  rows.push(`<div><span>已核验</span><strong>${verified} 题</strong></div>`);
  els.bankStats.innerHTML = rows.length ? rows.join("") : `<p class="subtle">题库加载中。</p>`;
}

function pickDiagnostic() {
  const byTopic = new Map();
  for (const question of shuffle(state.questions)) {
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
  const weighted = state.questions.flatMap((question) => {
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
  return shuffle(state.questions.filter((question) => wrongIds.has(question.id))).slice(0, 20);
}

function startSession(mode, questions) {
  if (!questions.length) return;
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
  els.modeLabel.textContent = mode === "diagnostic" ? "摸底测试" : mode === "wrong" ? "错题复习" : "强化练习";
  els.sessionTitle.textContent = mode === "diagnostic" ? "30 题快速诊断" : mode === "wrong" ? "集中处理错题" : "薄弱点优先训练";
  saveDraft();
  renderQuestion();
}

function renderQuestion() {
  const question = state.session[state.current];
  const savedAnswer = state.answers.find((answer) => answer.questionId === question.id);
  state.selected = savedAnswer?.selected || "";
  els.topicBadge.textContent = question.topic;
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
  if (!state.selected) return;
  const correct = state.selected === question.answer;
  state.answers = state.answers.filter((answer) => answer.questionId !== question.id);
  const answer = { questionId: question.id, topic: question.topic, selected: state.selected, answer: question.answer, correct };
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
  return {
    subject: question.subject || "财务管理",
    topic: question.topic,
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
  if (!aiConfig.endpoint) {
    throw new Error("尚未配置代理地址");
  }
  const response = await fetch(aiConfig.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json();
}

function mockAiExplanation(question, answer) {
  const selectedText = question.options[answer.selected] || "未选择";
  const correctText = question.options[question.answer] || "";
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
  const questionById = new Map(state.questions.map((question) => [question.id, question]));
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
  els.modeLabel.textContent = state.mode === "diagnostic" ? "继续摸底" : state.mode === "wrong" ? "继续错题" : "继续强化";
  els.sessionTitle.textContent = "继续上次作答";
  renderQuestion();
  return true;
}

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
els.reviewWrong.addEventListener("click", () => {
  const questions = pickWrong();
  if (questions.length) startSession("wrong", questions);
});
els.resetData.addEventListener("click", () => {
  if (confirm("确认清空本地答题记录？")) {
    localStorage.removeItem(storageKey);
    state.session = [];
    state.current = 0;
    state.answers = [];
    state.selected = "";
    state.mode = "idle";
    state.sessionId = "";
    els.questionView.classList.add("hidden");
    els.resultView.classList.add("hidden");
    els.emptyView.classList.remove("hidden");
    renderSidebar();
  }
});

fetch("./questions.json")
  .then((response) => response.json())
  .then((questions) => {
    state.questions = questions;
    renderSidebar();
    resumeDraft();
  });
