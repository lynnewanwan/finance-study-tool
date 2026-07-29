const state = {
  questions: [],
  session: [],
  current: 0,
  selected: "",
  answers: [],
  mode: "idle",
};

const storageKey = "finance-study-tool-v1";

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

function saveAttempt(attempt) {
  const progress = loadProgress();
  progress.attempts.push({ ...attempt, at: new Date().toISOString() });
  localStorage.setItem(storageKey, JSON.stringify(progress));
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
  state.mode = mode;
  state.session = questions;
  state.current = 0;
  state.answers = [];
  state.selected = "";
  els.emptyView.classList.add("hidden");
  els.resultView.classList.add("hidden");
  els.questionView.classList.remove("hidden");
  els.modeLabel.textContent = mode === "diagnostic" ? "摸底测试" : mode === "wrong" ? "错题复习" : "强化练习";
  els.sessionTitle.textContent = mode === "diagnostic" ? "30 题快速诊断" : mode === "wrong" ? "集中处理错题" : "薄弱点优先训练";
  renderQuestion();
}

function renderQuestion() {
  const question = state.session[state.current];
  state.selected = "";
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
  els.submitAnswer.classList.remove("hidden");
  els.nextQuestion.classList.add("hidden");
  updateProgress();
}

function updateProgress() {
  const total = state.session.length;
  const done = Math.min(state.current, total);
  els.progressText.textContent = `${done} / ${total}`;
  els.progressBar.style.width = total ? `${(done / total) * 100}%` : "0";
}

function submitAnswer() {
  const question = state.session[state.current];
  if (!state.selected) return;
  const correct = state.selected === question.answer;
  state.answers.push({ questionId: question.id, topic: question.topic, correct });
  saveAttempt({ questionId: question.id, topic: question.topic, selected: state.selected, answer: question.answer, correct });

  for (const button of els.options.querySelectorAll(".option")) {
    const key = button.dataset.key;
    button.disabled = true;
    if (key === question.answer) button.classList.add("correct");
    if (key === state.selected && !correct) button.classList.add("wrong");
  }
  els.feedback.classList.remove("hidden");
  els.feedback.innerHTML = `<strong>${correct ? "答对了" : `答错了，正确答案是 ${question.answer}`}</strong><br>${question.explanation}`;
  els.submitAnswer.classList.add("hidden");
  els.nextQuestion.classList.remove("hidden");
}

function nextQuestion() {
  state.current += 1;
  if (state.current >= state.session.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

function showResult() {
  const correct = state.answers.filter((item) => item.correct).length;
  const total = state.answers.length;
  const weak = topicStats(state.answers).filter((item) => item.wrong > 0).slice(0, 3);
  els.questionView.classList.add("hidden");
  els.resultView.classList.remove("hidden");
  els.resultTitle.textContent = state.mode === "diagnostic" ? "摸底完成" : "本轮练习完成";
  els.resultSummary.innerHTML = `
    <div class="result-card"><strong>${correct}/${total}</strong><span>本轮答对</span></div>
    <div class="result-card"><strong>${Math.round((correct / total) * 100)}%</strong><span>本轮正确率</span></div>
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

els.options.addEventListener("click", (event) => {
  const button = event.target.closest(".option");
  if (!button || button.disabled) return;
  state.selected = button.dataset.key;
  for (const item of els.options.querySelectorAll(".option")) item.classList.remove("selected");
  button.classList.add("selected");
});

els.submitAnswer.addEventListener("click", submitAnswer);
els.nextQuestion.addEventListener("click", nextQuestion);
els.startDiagnostic.addEventListener("click", () => startSession("diagnostic", pickDiagnostic()));
els.startPractice.addEventListener("click", () => startSession("practice", pickPractice()));
els.reviewWrong.addEventListener("click", () => {
  const questions = pickWrong();
  if (questions.length) startSession("wrong", questions);
});
els.resetData.addEventListener("click", () => {
  if (confirm("确认清空本地答题记录？")) {
    localStorage.removeItem(storageKey);
    renderSidebar();
  }
});

fetch("./questions.json")
  .then((response) => response.json())
  .then((questions) => {
    state.questions = questions;
    renderSidebar();
  });
