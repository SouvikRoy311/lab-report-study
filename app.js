const STUDY_CONFIG = window.STUDY_CONFIG || { APPS_SCRIPT_URL: "" };

const APP_VERSION = "2026-04-27-comparison-v2-final-no-practice";
const TOTAL_REAL_TRIALS = 3;

const FORMAT_META = {
  T1: { code: "T1", name: "Plain table" },
  T2: { code: "T2", name: "Table + flags" },
  T3: { code: "T3", name: "Visual range bar" },
  T4: { code: "T4", name: "Range bar + cue" }
};

const QUESTION_OPTIONS = {
  q1: ["Patient 1", "Patient 2", "Same"],
  q2: ["Patient 1", "Patient 2", "Same"],
  q3: ["Current category", "Trend", "Numerical change tie-breaker"],
  q4: ["Patient 1", "Patient 2", "Same priority"]
};

const CASES = {
  P: {
    caseId: "P",
    title: "Practice Report — Thyroid Stimulating Hormone",
    subtitle: "Practice only. Learn the rule before the recorded trials begin.",
    testName: "Thyroid Stimulating Hormone (TSH)",
    unit: "mIU/L",
    categories: [
      { label: "Normal", code: "N", min: 0.4, max: 4.0 },
      { label: "Borderline", code: "B", min: 4.1, max: 10.0 },
      { label: "High", code: "H", min: 10.1, max: 20.0 },
      { label: "Very High", code: "VH", min: 20.1, max: 30.0 }
    ],
    patients: [
      { label: "Patient 1", previous: 4.4, current: 8.8, cue: "Current value remains borderline and has increased from the previous value." },
      { label: "Patient 2", previous: 6.0, current: 8.0, cue: "Current value remains borderline and has increased from the previous value." }
    ],
    answers: { q1: "Same", q2: "Same", q3: "Numerical change tie-breaker", q4: "Patient 1" }
  },
  A: {
    caseId: "A",
    title: "Fasting Glucose",
    subtitle: "Compare the two patients using the priority rule shown below.",
    testName: "Fasting Glucose",
    unit: "mg/dL",
    categories: [
      { label: "Normal", code: "N", min: 70, max: 99 },
      { label: "Borderline", code: "B", min: 100, max: 125 },
      { label: "High", code: "H", min: 126, max: 199 },
      { label: "Very High", code: "VH", min: 200, max: 260 }
    ],
    patients: [
      { label: "Patient 1", previous: 82, current: 112, cue: "Current value moved from normal to borderline range." },
      { label: "Patient 2", previous: 118, current: 90, cue: "Current value moved from borderline back into normal range." }
    ],
    answers: { q1: "Same", q2: "Same", q3: "Numerical change tie-breaker", q4: "Patient 1" }
  },
  B: {
    caseId: "B",
    title: "Hemoglobin A1C",
    subtitle: "Compare the two patients using the priority rule shown below.",
    testName: "Hemoglobin A1C",
    unit: "%",
    categories: [
      { label: "Normal", code: "N", min: 4.5, max: 5.6 },
      { label: "Borderline", code: "B", min: 5.7, max: 6.4 },
      { label: "High", code: "H", min: 6.5, max: 8.0 },
      { label: "Very High", code: "VH", min: 8.1, max: 10.0 }
    ],
    patients: [
      { label: "Patient 1", previous: 6.4, current: 5.8, cue: "Current value remains borderline but has improved compared with the previous value." },
      { label: "Patient 2", previous: 5.7, current: 6.3, cue: "Current value remains borderline and has worsened compared with the previous value." }
    ],
    answers: { q1: "Same", q2: "Patient 2", q3: "Trend", q4: "Patient 2" }
  },
  C: {
    caseId: "C",
    title: "LDL Cholesterol",
    subtitle: "Compare the two patients using the priority rule shown below.",
    testName: "LDL Cholesterol",
    unit: "mg/dL",
    categories: [
      { label: "Normal", code: "N", min: 40, max: 99 },
      { label: "Borderline", code: "B", min: 100, max: 159 },
      { label: "High", code: "H", min: 160, max: 189 },
      { label: "Very High", code: "VH", min: 190, max: 260 }
    ],
    patients: [
      { label: "Patient 1", previous: 125, current: 185, cue: "Current value moved from borderline to high range." },
      { label: "Patient 2", previous: 160, current: 180, cue: "Current value remains in the high range and has increased from the previous value." }
    ],
    answers: { q1: "Patient 1", q2: "Patient 1", q3: "Current category", q4: "Patient 1" }
  }
};

const state = {
  participantId: null,
  participantInitials: "",
  assignment: null,
  trialIndex: -1,
  inPractice: true,
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
  phaseLabel: document.getElementById("phaseLabel"),
  practiceBanner: document.getElementById("practiceBanner"),
  trialCounter: document.getElementById("trialCounter"),
  caseTitle: document.getElementById("caseTitle"),
  caseSubtitle: document.getElementById("caseSubtitle"),
  progressFill: document.getElementById("progressFill"),
  participantSummary: document.getElementById("participantSummary"),
  formatLabel: document.getElementById("formatLabel"),
  timerBadge: document.getElementById("timerBadge"),
  reportContainer: document.getElementById("reportContainer"),
  q1Options: document.getElementById("q1Options"),
  q2Options: document.getElementById("q2Options"),
  q3Options: document.getElementById("q3Options"),
  q4Options: document.getElementById("q4Options"),
  questionForm: document.getElementById("questionForm"),
  nextBtn: document.getElementById("nextBtn"),
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

function getAssignment(participantId) {
  return ASSIGNMENT_LOOKUP[participantId] || null;
}

function categoryForValue(value, categories) {
  for (const cat of categories) {
    if (value >= cat.min && value <= cat.max) return cat;
  }
  return categories[categories.length - 1];
}

function trendLabel(previous, current) {
  if (current > previous) return "Worsening";
  if (current < previous) return "Improving";
  return "Stable";
}

function swatchClass(label) {
  const lower = label.toLowerCase();
  if (lower.includes("very")) return "very-high";
  if (lower.includes("high")) return "high";
  if (lower.includes("border")) return "borderline";
  return "normal";
}

function rangeBounds(categories, patients) {
  const mins = categories.map(x => x.min);
  const maxs = categories.map(x => x.max);
  const values = [];
  patients.forEach(p => values.push(p.previous, p.current));
  return { min: Math.min(...mins, ...values), max: Math.max(...maxs, ...values) };
}

function valueToPercent(value, min, max) {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function renderPlainTable(caseData, withFlags = false) {
  const rangeText = caseData.categories.map(c => `${c.label}: ${formatNumber(c.min)}–${formatNumber(c.max)}`).join(" · ");
  const cards = caseData.patients.map(patient => {
    const currentCat = categoryForValue(patient.current, caseData.categories);
    return `
      <div class="patient-card patient-card-table">
        <div class="patient-head">
          <div>
            <h3>${patient.label}</h3>
            <p class="small-muted no-margin">${caseData.testName}</p>
          </div>
        </div>
        <table class="lab-table compact-table">
          <thead>
            <tr>
              <th>Previous</th>
              <th>Current</th>
              <th>Unit</th>
              ${withFlags ? "<th>Flag</th>" : ""}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatNumber(patient.previous)}</td>
              <td><strong>${formatNumber(patient.current)}</strong></td>
              <td>${caseData.unit}</td>
              ${withFlags ? `<td><span class="flag-badge flag-${currentCat.code}">${currentCat.label}</span></td>` : ""}
            </tr>
          </tbody>
        </table>
        <p class="small-muted range-text"><strong>Displayed ranges:</strong> ${rangeText}</p>
      </div>
    `;
  }).join("");
  return `<div class="pair-shell pair-table">${cards}</div>`;
}

function renderRangePair(caseData, withCue = false) {
  const bounds = rangeBounds(caseData.categories, caseData.patients);
  const total = bounds.max - bounds.min;
  const cards = caseData.patients.map(patient => {
    const segments = caseData.categories.map(cat => {
      const width = ((cat.max - cat.min) / total) * 100;
      return `<div class="range-segment seg-${swatchClass(cat.label)}" style="width:${width}%"></div>`;
    }).join("");
    const previousPct = valueToPercent(patient.previous, bounds.min, bounds.max);
    const currentPct = valueToPercent(patient.current, bounds.min, bounds.max);
    const legend = caseData.categories.map(cat => `<span class="legend-chip"><span class="swatch swatch-${swatchClass(cat.label)}"></span>${cat.label}</span>`).join("");
    return `
      <div class="patient-card patient-card-range">
        <div class="patient-head">
          <div>
            <h3>${patient.label}</h3>
            <p class="small-muted no-margin">${caseData.testName}</p>
          </div>
        </div>
        <div class="range-bar-wrap">
          <div class="marker-label curr-label" style="left:${currentPct}%">Current ${formatNumber(patient.current)}</div>
          <div class="range-bar">${segments}</div>
          <div class="marker marker-current" style="left:${currentPct}%" title="Current ${formatNumber(patient.current)}"></div>
          <div class="marker marker-previous" style="left:${previousPct}%" title="Previous ${formatNumber(patient.previous)}"></div>
          <div class="marker-label prev-label" style="left:${previousPct}%">Previous ${formatNumber(patient.previous)}</div>
        </div>
        <div class="legend-row">${legend}</div>
        ${withCue ? `<div class="cue-box"><strong>Interpretive cue</strong><p class="no-margin">${patient.cue}</p></div>` : ""}
      </div>
    `;
  }).join("");
  return `<div class="pair-shell pair-range">${cards}</div>`;
}

function renderReports(formatCode, caseData) {
  if (formatCode === "T1") return renderPlainTable(caseData, false);
  if (formatCode === "T2") return renderPlainTable(caseData, true);
  if (formatCode === "T3") return renderRangePair(caseData, false);
  return renderRangePair(caseData, true);
}

function updateStudyStatus(text) {
  els.statusPill.textContent = text;
}

function getCurrentTrialDescriptor() {
  return state.assignment.trials[state.trialIndex];
}

function renderQuestionOptions() {
  buildOptionButtons(els.q1Options, "q1", QUESTION_OPTIONS.q1);
  buildOptionButtons(els.q2Options, "q2", QUESTION_OPTIONS.q2);
  buildOptionButtons(els.q3Options, "q3", QUESTION_OPTIONS.q3);
  buildOptionButtons(els.q4Options, "q4", QUESTION_OPTIONS.q4);
}

function renderCurrentStage() {
  const trial = getCurrentTrialDescriptor();
  const caseData = CASES[trial.caseId];
  const formatInfo = FORMAT_META[trial.format];

  selectedAnswers = { q1: null, q2: null, q3: null, q4: null };
  els.formError.textContent = "";
  renderQuestionOptions();

  els.phaseLabel.textContent = `Task ${state.trialIndex + 1} of ${TOTAL_REAL_TRIALS}`;
  if (els.trialCounter) els.trialCounter.textContent = `Recorded task ${state.trialIndex + 1} of ${TOTAL_REAL_TRIALS}`;
  els.caseTitle.textContent = caseData.title;
  els.caseSubtitle.textContent = caseData.subtitle;
  els.formatLabel.textContent = `${formatInfo.code} — ${formatInfo.name}`;
  els.timerBadge.textContent = "Response time is being recorded.";
  els.reportContainer.innerHTML = renderReports(trial.format, caseData);
  els.practiceBanner.classList.add("hidden");
  els.participantSummary.textContent = `${state.participantId} · block ${state.assignment.blockGroup}`;
  els.progressFill.style.width = `${((state.trialIndex + 1) / TOTAL_REAL_TRIALS) * 100}%`;
  els.nextBtn.textContent = state.trialIndex === TOTAL_REAL_TRIALS - 1 ? "Submit study" : "Continue";

  state.trialStart = performance.now();
  updateStudyStatus(`Task ${state.trialIndex + 1} of ${TOTAL_REAL_TRIALS}`);
}

function scoreTrial(trial, answers, rtMs) {
  const caseData = CASES[trial.caseId];
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
    q1_correct: correctness.q1,
    q2_response: answers.q2,
    q2_correct: correctness.q2,
    q3_response: answers.q3,
    q3_correct: correctness.q3,
    q4_response: answers.q4,
    q4_correct: correctness.q4,
    totalScore: correctness.q1 + correctness.q2 + correctness.q3 + correctness.q4,
    submittedAtClient: new Date().toISOString()
  };
}

function submitToAppsScript(payload) {
  const url = (STUDY_CONFIG.APPS_SCRIPT_URL || "").trim();
  if (!url) return;
  els.hiddenSubmitForm.action = url;
  els.payloadField.value = JSON.stringify(payload);
  els.hiddenSubmitForm.submit();
}

function downloadBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.participantId}_lab_report_comparison_backup.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function finishStudy() {
  const payload = {
    studyId: "lab-report-comparison-bibd-v2",
    participantId: state.participantId,
    participantInitials: state.participantInitials,
    participantNumber: state.assignment.participantNumber,
    blockGroup: state.assignment.blockGroup,
    orderPattern: state.assignment.orderPattern,
    mappingPattern: state.assignment.mappingPattern,
    submittedAtClient: new Date().toISOString(),
    appVersion: APP_VERSION,
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
    els.introError.textContent = "Enter the participant ID given by the researcher.";
    return;
  }
  const assignment = getAssignment(normalizedId);
  if (!assignment) {
    els.introError.textContent = "This participant ID is not in the assignment list.";
    return;
  }

  state.participantId = normalizedId;
  state.participantInitials = els.participantName.value.trim();
  state.assignment = assignment;
  state.trialIndex = 0;
  state.inPractice = false;
  state.responses = [];

  els.introCard.classList.add("hidden");
  els.doneCard.classList.add("hidden");
  els.studyCard.classList.remove("hidden");
  renderCurrentStage();
}

function allAnswered() {
  return Object.values(selectedAnswers).every(Boolean);
}

function handleTrialSubmit(event) {
  event.preventDefault();
  els.formError.textContent = "";

  if (!allAnswered()) {
    els.formError.textContent = "Please answer all four questions before continuing.";
    return;
  }

  const rtMs = performance.now() - state.trialStart;

  const trial = getCurrentTrialDescriptor();
  const scored = scoreTrial(trial, selectedAnswers, rtMs);
  state.responses.push(scored);

  state.trialIndex += 1;
  if (state.trialIndex >= TOTAL_REAL_TRIALS) {
    finishStudy();
  } else {
    renderCurrentStage();
  }
}

function handleRestart() {
  window.location.reload();
}

els.startBtn.addEventListener("click", handleStart);
els.questionForm.addEventListener("submit", handleTrialSubmit);
els.restartBtn.addEventListener("click", handleRestart);
updateStudyStatus("Ready to start");
