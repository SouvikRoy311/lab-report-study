const STUDY_CONFIG = window.STUDY_CONFIG || { APPS_SCRIPT_URL: "" };

const FORMAT_META = {
  T1: { code: "T1", name: "Plain table", short: "Plain numeric table" },
  T2: { code: "T2", name: "Table + flag", short: "Numeric table with category flag" },
  T3: { code: "T3", name: "Visual range bar", short: "Horizontal range bar" },
  T4: { code: "T4", name: "Range bar + cue", short: "Range bar with interpretive cue" }
};

const CASES = {
  A: {
    caseId: "A",
    title: "Case A — Fasting Glucose",
    subtitle: "Borderline case. The current value is just outside the normal range.",
    testName: "Fasting Glucose",
    unit: "mg/dL",
    previousValue: 97,
    currentValue: 101,
    categories: [
      { label: "Normal", min: 70, max: 99, color: "normal" },
      { label: "Borderline", min: 100, max: 125, color: "borderline" },
      { label: "High", min: 126, max: 160, color: "high" }
    ],
    cueText: "Current value is slightly above the normal range.",
    answers: {
      q1: "Borderline",
      q2: "Worse",
      q3: "No",
      q4: "Discuss at regular follow-up"
    }
  },
  B: {
    caseId: "B",
    title: "Case B — Hemoglobin A1C",
    subtitle: "Borderline but improving. The current value remains outside the normal range.",
    testName: "Hemoglobin A1C",
    unit: "%",
    previousValue: 6.4,
    currentValue: 6.2,
    categories: [
      { label: "Normal", min: 4.5, max: 5.6, color: "normal" },
      { label: "Borderline", min: 5.7, max: 6.4, color: "borderline" },
      { label: "High", min: 6.5, max: 8.0, color: "high" }
    ],
    cueText: "Current value is still above normal, but better than the previous value.",
    answers: {
      q1: "Borderline",
      q2: "Better",
      q3: "No",
      q4: "Discuss at regular follow-up"
    }
  },
  C: {
    caseId: "C",
    title: "Case C — LDL Cholesterol",
    subtitle: "Clearly abnormal case. The current value is well above target.",
    testName: "LDL Cholesterol",
    unit: "mg/dL",
    previousValue: 172,
    currentValue: 182,
    categories: [
      { label: "Normal", min: 40, max: 99, color: "normal" },
      { label: "Borderline", min: 130, max: 159, color: "borderline" },
      { label: "High", min: 160, max: 189, color: "high" },
      { label: "Very High", min: 190, max: 220, color: "high" }
    ],
    cueText: "Current value is well above the target range.",
    answers: {
      q1: "High",
      q2: "Worse",
      q3: "No",
      q4: "Prompt follow-up"
    }
  }
};

const QUESTION_OPTIONS = {
  q1: ["Normal", "Borderline", "High"],
  q2: ["Better", "Same", "Worse"],
  q3: ["Yes", "No"],
  q4: ["Routine", "Discuss at regular follow-up", "Prompt follow-up"]
};

const state = {
  participantId: null,
  participantInitials: "",
  assignment: null,
  trialIndex: 0,
  trialStart: null,
  responses: []
};

const els = {
  introCard: document.getElementById("introCard"),
  studyCard: document.getElementById("studyCard"),
  doneCard: document.getElementById("doneCard"),
  statusPill: document.getElementById("statusPill"),
  consentCheckbox: document.getElementById("consentCheckbox"),
  participantId: document.getElementById("participantId"),
  participantName: document.getElementById("participantName"),
  startBtn: document.getElementById("startBtn"),
  introError: document.getElementById("introError"),
  trialCounter: document.getElementById("trialCounter"),
  caseTitle: document.getElementById("caseTitle"),
  caseSubtitle: document.getElementById("caseSubtitle"),
  progressFill: document.getElementById("progressFill"),
  participantSummary: document.getElementById("participantSummary"),
  formatLabel: document.getElementById("formatLabel"),
  reportContainer: document.getElementById("reportContainer"),
  q1Options: document.getElementById("q1Options"),
  q2Options: document.getElementById("q2Options"),
  q3Options: document.getElementById("q3Options"),
  q4Options: document.getElementById("q4Options"),
  questionForm: document.getElementById("questionForm"),
  formError: document.getElementById("formError"),
  doneParticipant: document.getElementById("doneParticipant"),
  restartBtn: document.getElementById("restartBtn"),
  hiddenSubmitForm: document.getElementById("hiddenSubmitForm"),
  payloadField: document.getElementById("payloadField")
};

let selectedAnswers = { q1: null, q2: null, q3: null, q4: null };

function normalizeParticipantId(value) {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  const digits = trimmed.match(/\d+/);
  if (!digits) return null;
  const n = parseInt(digits[0], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const normalized = ((n - 1) % 48) + 1;
  return `P${String(normalized).padStart(2, "0")}`;
}

function buildOptionButtons(container, qKey, options) {
  container.innerHTML = "";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option;
    btn.dataset.value = option;
    btn.addEventListener("click", () => {
      selectedAnswers[qKey] = option;
      [...container.querySelectorAll(".option-btn")].forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
    });
    container.appendChild(btn);
  });
}

function getCurrentTrial() {
  return state.assignment.trials[state.trialIndex];
}

function getCase(caseId) {
  return CASES[caseId];
}

function rangeBounds(categories, previousValue, currentValue) {
  const mins = categories.map(x => x.min);
  const maxs = categories.map(x => x.max);
  return {
    min: Math.min(...mins, previousValue, currentValue),
    max: Math.max(...maxs, previousValue, currentValue)
  };
}

function valueToPercent(value, min, max) {
  return ((value - min) / (max - min)) * 100;
}

function getCategory(value, categories) {
  for (const cat of categories) {
    if (value >= cat.min && value <= cat.max) {
      if (cat.label === "Borderline") return { label: "Borderline", short: "B" };
      if (cat.label === "Normal") return { label: "Normal", short: "N" };
      return { label: "High", short: cat.label === "Very High" ? "VH" : "H" };
    }
  }
  return { label: "High", short: "H" };
}

function renderTable(caseData, withFlag = false) {
  const flag = getCategory(caseData.currentValue, caseData.categories);
  const rangeText = caseData.categories.map(c => `${c.label}: ${c.min}–${c.max}`).join(" · ");
  return `
    <div class="report-card">
      <div class="report-heading">
        <div>
          <h3>${caseData.testName}</h3>
          <p class="small-muted">Read the current value using the displayed ranges.</p>
        </div>
        <div class="format-badge">${withFlag ? "Table + flag" : "Plain table"}</div>
      </div>
      <table class="lab-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Unit</th>
            <th>Displayed ranges</th>
            ${withFlag ? "<th>Flag</th>" : ""}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${caseData.testName}</strong></td>
            <td>${caseData.previousValue}</td>
            <td><strong>${caseData.currentValue}</strong></td>
            <td>${caseData.unit}</td>
            <td>${rangeText}</td>
            ${withFlag ? `<td><span class="flag-badge flag-${flag.short}">${flag.short}</span></td>` : ""}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function swatchClass(label) {
  const lower = label.toLowerCase();
  if (lower.includes("normal")) return "normal";
  if (lower.includes("border")) return "borderline";
  return "high";
}

function renderRangeBar(caseData, withCue = false) {
  const bounds = rangeBounds(caseData.categories, caseData.previousValue, caseData.currentValue);
  const total = bounds.max - bounds.min;
  const segments = caseData.categories.map(cat => {
    const width = ((cat.max - cat.min) / total) * 100;
    const cls = cat.label.toLowerCase().replace(/\s+/g, "-");
    return `<div class="range-segment seg-${cls}" style="width:${width}%"></div>`;
  }).join("");

  const legends = caseData.categories.map(cat => {
    return `<span class="legend-chip"><span class="swatch swatch-${swatchClass(cat.label)}"></span>${cat.label}: ${cat.min}–${cat.max}</span>`;
  }).join("");

  const previousPct = valueToPercent(caseData.previousValue, bounds.min, bounds.max);
  const currentPct = valueToPercent(caseData.currentValue, bounds.min, bounds.max);

  return `
    <div class="report-card">
      <div class="report-heading">
        <div>
          <h3>${caseData.testName}</h3>
          <p class="small-muted">The bar shows where the value lies relative to the displayed ranges.</p>
        </div>
        <div class="format-badge">${withCue ? "Range bar + cue" : "Visual range bar"}</div>
      </div>
      <div class="range-stack">
        <div class="range-row">
          <div class="range-label">
            <strong>${caseData.testName}</strong>
            <span class="small-muted">Unit: ${caseData.unit}</span>
          </div>
          <div class="range-bar-wrap">
            <div class="range-bar">${segments}</div>
            <div class="marker previous" style="left:${previousPct}%"></div>
            <div class="marker current" style="left:${currentPct}%"></div>
            <div class="marker-label" style="left:${previousPct}%">Prev: ${caseData.previousValue}</div>
            <div class="marker-label" style="left:${currentPct}%; top: 26px;">Curr: ${caseData.currentValue}</div>
            <div class="legend-row">${legends}</div>
          </div>
          <div class="small-muted">
            <div><strong>Previous:</strong> ${caseData.previousValue} ${caseData.unit}</div>
            <div><strong>Current:</strong> ${caseData.currentValue} ${caseData.unit}</div>
          </div>
        </div>
      </div>
      ${withCue ? `<div class="cue-box"><strong>Interpretive cue</strong>${caseData.cueText}</div>` : ""}
    </div>
  `;
}

function renderReport(formatCode, caseData) {
  if (formatCode === "T1") return renderTable(caseData, false);
  if (formatCode === "T2") return renderTable(caseData, true);
  if (formatCode === "T3") return renderRangeBar(caseData, false);
  return renderRangeBar(caseData, true);
}

function updateStudyStatus(text) {
  els.statusPill.textContent = text;
}

function renderTrial() {
  const trial = getCurrentTrial();
  const caseData = getCase(trial.caseId);
  const formatInfo = FORMAT_META[trial.format];

  selectedAnswers = { q1: null, q2: null, q3: null, q4: null };
  els.formError.textContent = "";

  els.trialCounter.textContent = String(state.trialIndex + 1);
  els.caseTitle.textContent = caseData.title;
  els.caseSubtitle.textContent = caseData.subtitle;
  els.progressFill.style.width = `${((state.trialIndex + 1) / 3) * 100}%`;
  els.participantSummary.textContent = `${state.participantId} · block ${state.assignment.blockGroup} · formats ${state.assignment.formatSet.join(", ")}`;
  els.formatLabel.textContent = `${formatInfo.code} — ${formatInfo.name}`;
  els.reportContainer.innerHTML = renderReport(trial.format, caseData);

  buildOptionButtons(els.q1Options, "q1", QUESTION_OPTIONS.q1);
  buildOptionButtons(els.q2Options, "q2", QUESTION_OPTIONS.q2);
  buildOptionButtons(els.q3Options, "q3", QUESTION_OPTIONS.q3);
  buildOptionButtons(els.q4Options, "q4", QUESTION_OPTIONS.q4);

  state.trialStart = performance.now();
  updateStudyStatus(`Trial ${state.trialIndex + 1} of 3`);
}

function scoreTrial(trial, answers, rtMs) {
  const caseData = getCase(trial.caseId);
  const correctness = {
    q1: answers.q1 === caseData.answers.q1 ? 1 : 0,
    q2: answers.q2 === caseData.answers.q2 ? 1 : 0,
    q3: answers.q3 === caseData.answers.q3 ? 1 : 0,
    q4: answers.q4 === caseData.answers.q4 ? 1 : 0
  };
  return {
    participantId: state.participantId,
    participantInitials: state.participantInitials,
    participantNumber: state.assignment.participantNumber,
    blockGroup: state.assignment.blockGroup,
    orderPattern: state.assignment.orderPattern,
    mappingPattern: state.assignment.mappingPattern,
    trialNumber: trial.trialNumber,
    format: trial.format,
    formatName: FORMAT_META[trial.format].name,
    caseId: trial.caseId,
    caseTitle: caseData.title,
    responseTimeMs: Math.round(rtMs),
    responseTimeSec: +(rtMs / 1000).toFixed(3),
    q1_response: answers.q1,
    q2_response: answers.q2,
    q3_response: answers.q3,
    q4_response: answers.q4,
    q1_correct: correctness.q1,
    q2_correct: correctness.q2,
    q3_correct: correctness.q3,
    q4_correct: correctness.q4,
    totalScore: correctness.q1 + correctness.q2 + correctness.q3 + correctness.q4,
    submittedAtClient: new Date().toISOString()
  };
}

function downloadBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.participantId}_lab_report_study_backup.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function submitToAppsScript(payload) {
  const url = (STUDY_CONFIG.APPS_SCRIPT_URL || "").trim();
  if (!url) return;
  els.hiddenSubmitForm.action = url;
  els.payloadField.value = JSON.stringify(payload);
  els.hiddenSubmitForm.submit();
}

function finishStudy() {
  const payload = {
    studyId: "lab-report-bibd-v1",
    participantId: state.participantId,
    participantInitials: state.participantInitials,
    participantNumber: state.assignment.participantNumber,
    blockGroup: state.assignment.blockGroup,
    orderPattern: state.assignment.orderPattern,
    mappingPattern: state.assignment.mappingPattern,
    submittedAtClient: new Date().toISOString(),
    appVersion: "2026-04-22",
    userAgent: navigator.userAgent,
    trials: state.responses
  };
  submitToAppsScript(payload);
  downloadBackup(payload);
  els.studyCard.classList.add("hidden");
  els.doneCard.classList.remove("hidden");
  els.doneParticipant.textContent = state.participantId;
  updateStudyStatus("Completed");
}

function handleStart() {
  els.introError.textContent = "";
  if (!els.consentCheckbox.checked) {
    els.introError.textContent = "Please tick the consent box before starting.";
    return;
  }
  const normalizedId = normalizeParticipantId(els.participantId.value);
  if (!normalizedId) {
    els.introError.textContent = "Enter a participant ID like P01, P02, ..., P48.";
    return;
  }
  const assignment = ASSIGNMENT_LOOKUP[normalizedId];
  if (!assignment) {
    els.introError.textContent = "This participant ID is not in the assignment list.";
    return;
  }

  state.participantId = normalizedId;
  state.participantInitials = els.participantName.value.trim();
  state.assignment = assignment;
  state.trialIndex = 0;
  state.responses = [];

  els.introCard.classList.add("hidden");
  els.doneCard.classList.add("hidden");
  els.studyCard.classList.remove("hidden");
  renderTrial();
}

function handleTrialSubmit(event) {
  event.preventDefault();
  els.formError.textContent = "";
  const allAnswered = Object.values(selectedAnswers).every(Boolean);
  if (!allAnswered) {
    els.formError.textContent = "Please answer all four questions before continuing.";
    return;
  }
  const trial = getCurrentTrial();
  const rtMs = performance.now() - state.trialStart;
  const scored = scoreTrial(trial, selectedAnswers, rtMs);
  state.responses.push(scored);

  state.trialIndex += 1;
  if (state.trialIndex >= 3) {
    finishStudy();
  } else {
    renderTrial();
  }
}

function handleRestart() {
  window.location.reload();
}

els.startBtn.addEventListener("click", handleStart);
els.questionForm.addEventListener("submit", handleTrialSubmit);
els.restartBtn.addEventListener("click", handleRestart);

updateStudyStatus("Ready to start");
