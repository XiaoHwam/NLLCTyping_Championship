const DEFAULT_PARAGRAPHS = [
  "Typing fast and accurate is a valuable skill for students, especially when they need to write essays or complete online assignments. Practice every day to build speed and confidence.",
  "A strong English typing challenge helps learners focus on words, punctuation, and spelling. It also trains the eyes and fingers to work together smoothly.",
  "During the competition, each student will have three minutes to type a paragraph from the prompt. The goal is to get the highest words per minute while keeping mistakes low.",
  "Accuracy matters just as much as speed. A true champion uses steady rhythm and clear thinking so every sentence stays correct.",
  "Reading short stories and classic paragraphs before typing makes the challenge more fun. It is a great way to improve vocabulary and language fluency.",
  "The classroom projector displays the live scoreboard so everyone can see who is leading. This creates excitement and encourages learners to do their best.",
  "A typing competition can help students build concentration. When the clock starts, they focus on each sentence and try to keep a steady pace.",
  "Teachers can choose from many paragraphs about school life, science, nature, and future dreams. This variety keeps the event interesting for every participant.",
  "Practice sessions before the competition are important. They help students become comfortable with the keyboard layout and the structure of timed tests.",
  "Typing with proper posture and a calm mind leads to better results. Students should sit tall, keep their wrists relaxed, and take slow, steady breaths.",
  "After each student finishes, the scoreboard updates to show rank, WPM, and accuracy. The top student is highlighted as the champion.",
  "Winning is not only about speed; it is about steady progress. Every learner can improve incrementally by practicing a few minutes each day.",
  "The best typing champions are those who keep trying even when they make mistakes. Each new paragraph is another chance to improve their skills.",
  "A 3-minute typing test is long enough to measure real progress, yet short enough to stay exciting. Students enjoy the challenge and the immediate results.",
  "Encouragement from classmates and teachers makes the competition more motivating. Everyone can cheer on the student who is on track to become the champion."
];

let paragraphs = [...DEFAULT_PARAGRAPHS];

const ADMIN_PASSWORD = "admin123";
const participantNameInput = document.getElementById("participant-name");
const addParticipantButton = document.getElementById("add-participant");
const removeStudentButton = document.getElementById("remove-student");
const studentSelectAdmin = document.getElementById("student-select-admin");
const studentSelectPublic = document.getElementById("student-select-public");
const adminPasswordInput = document.getElementById("admin-password");
const adminLoginButton = document.getElementById("admin-login-button");
const adminStatus = document.getElementById("admin-status");
const adminControls = document.getElementById("admin-controls");
const registrationPanel = document.getElementById("registration-panel");
const startTestButton = document.getElementById("start-test");
const resetAllButton = document.getElementById("reset-all");
const promptArea = document.getElementById("prompt-area");
const paragraphNumberSpan = document.getElementById("paragraph-number");
const timerSpan = document.getElementById("timer");
const finishTestButton = document.getElementById("finish-test");
const clearInputButton = document.getElementById("clear-input");
const nextParticipantButton = document.getElementById("next-participant");
const resultName = document.getElementById("result-name");
const resultWords = document.getElementById("result-words");
const resultWpm = document.getElementById("result-wpm");
const resultAccuracy = document.getElementById("result-accuracy");
const resultChars = document.getElementById("result-chars");
const resultCorrect = document.getElementById("result-correct");
const scoreboardBody = document.querySelector("#scoreboard-table tbody");
const championNameSpan = document.getElementById("champion-name");
const championWpmSpan = document.getElementById("champion-wpm");
const scoreboardPanel = document.getElementById("scoreboard-panel");
const newParagraphInput = document.getElementById("new-paragraph");
const addParagraphButton = document.getElementById("add-paragraph");
const paragraphCountSpan = document.getElementById("paragraph-count");
const testPanel = document.getElementById("test-panel");

let students = [];
let records = [];
let currentPrompt = "";
let currentStudent = null;
let timeLeft = 180;
let timerId = null;
let activeParagraphIndex = 0;
let typedText = "";
let currentIndex = 0;
let visibleCount = 0;
let isAdmin = false;

const INITIAL_VISIBLE_CHARS = 140;
const PRESHOW_THRESHOLD = 36;
const REVEAL_CHUNK = 48;

function saveState() {
  localStorage.setItem("typingChallengeStudents", JSON.stringify(students));
  localStorage.setItem("typingChallengeRecords", JSON.stringify(records));
  localStorage.setItem("typingChallengeParagraphs", JSON.stringify(paragraphs.slice(DEFAULT_PARAGRAPHS.length)));
}

function loadState() {
  const savedStudents = localStorage.getItem("typingChallengeStudents");
  const savedRecords = localStorage.getItem("typingChallengeRecords");
  const savedParagraphs = localStorage.getItem("typingChallengeParagraphs");
  if (savedStudents) {
    students = JSON.parse(savedStudents);
  }
  if (savedRecords) {
    records = JSON.parse(savedRecords);
  }
  if (savedParagraphs) {
    paragraphs = [...DEFAULT_PARAGRAPHS, ...JSON.parse(savedParagraphs)];
  }
}

function updateStudentSelect() {
  [studentSelectAdmin, studentSelectPublic].forEach((select) => {
    select.innerHTML = '<option value="">-- Select student --</option>';
    students.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  });
  saveState();
}

function updateParagraphCount() {
  paragraphCountSpan.textContent = paragraphs.length;
}

function renderPromptText(text) {
  promptArea.innerHTML = "";
  typedText = "";
  currentIndex = 0;
  visibleCount = Math.min(INITIAL_VISIBLE_CHARS, text.length);
  const fragment = document.createDocumentFragment();

  for (const char of text) {
    const span = document.createElement("span");
    span.className = "prompt-char";
    span.textContent = char === " " ? "\u00A0" : char;
    fragment.appendChild(span);
  }

  promptArea.appendChild(fragment);
  updateVisibleChars();
  updateCursor();
  scrollToCursor();
}

function updateCursor() {
  promptArea.querySelectorAll(".prompt-char").forEach((span, index) => {
    span.classList.toggle("cursor", index === currentIndex);
  });
}

function updateVisibleChars() {
  const spans = promptArea.querySelectorAll(".prompt-char");
  spans.forEach((span, index) => {
    span.classList.toggle("hidden", index >= visibleCount);
  });
}

function scrollToCursor() {
  const currentSpan = promptArea.querySelectorAll(".prompt-char")[currentIndex];
  if (currentSpan) {
    currentSpan.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }
}

function handleTypingKey(event) {
  if (!currentPrompt || timeLeft <= 0) {
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    if (currentIndex === 0) {
      return;
    }
    currentIndex -= 1;
    typedText = typedText.slice(0, -1);
    const span = promptArea.querySelectorAll(".prompt-char")[currentIndex];
    span.classList.remove("correct", "incorrect");
    updateCursor();
    return;
  }

  if (event.key.length !== 1 && event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const inputChar = event.key === "Enter" ? "\n" : event.key;
  if (currentIndex >= currentPrompt.length) {
    return;
  }

  const expected = currentPrompt[currentIndex];
  const span = promptArea.querySelectorAll(".prompt-char")[currentIndex];
  const typedChar = expected === " " && inputChar === " " ? " " : inputChar;

  if (typedChar === expected) {
    span.classList.add("correct");
    span.classList.remove("incorrect");
  } else {
    span.classList.add("incorrect");
    span.classList.remove("correct");
  }

  typedText += typedChar;
  currentIndex += 1;
  if (currentIndex + PRESHOW_THRESHOLD > visibleCount && visibleCount < currentPrompt.length) {
    visibleCount = Math.min(currentPrompt.length, visibleCount + REVEAL_CHUNK);
    updateVisibleChars();
  }
  updateCursor();
  scrollToCursor();
}

function setAdminMode(enabled) {
  isAdmin = enabled;
  adminControls.classList.toggle("hidden", !enabled);
  scoreboardPanel.classList.toggle("hidden", !enabled);
  testPanel.classList.toggle("hidden", enabled);
  studentSelectPublic.disabled = enabled;
  startTestButton.disabled = enabled;
  adminStatus.textContent = enabled
    ? "Admin mode is ON. You may add/remove participants, add paragraphs, and reset the competition."
    : "Admin mode is off. Only admin can add or remove participants.";
  adminPasswordInput.value = "";
}

function renderScoreboard() {
  scoreboardBody.innerHTML = "";
  if (records.length === 0) {
    championNameSpan.textContent = "-";
    championWpmSpan.textContent = "-";
    return;
  }

  const sorted = [...records].sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy);
  sorted.forEach((record, index) => {
    const row = document.createElement("tr");
    if (index === 0) {
      row.style.backgroundColor = "rgba(46, 131, 255, 0.08)";
    }
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${record.name}</td>
      <td>${record.wpm.toFixed(1)}</td>
      <td>${record.accuracy.toFixed(1)}%</td>
      <td>${record.paragraph}</td>
    `;
    scoreboardBody.appendChild(row);
  });

  championNameSpan.textContent = sorted[0].name;
  championWpmSpan.textContent = `${sorted[0].wpm.toFixed(1)} WPM`;
  saveState();
}

function choosePrompt() {
  currentPrompt = paragraphs.join("\n\n");
  renderPromptText(currentPrompt);
  paragraphNumberSpan.textContent = `Text set: All ${paragraphs.length}`;
}

function setTimerText(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(seconds % 60).padStart(2, "0");
  timerSpan.textContent = `${min}:${sec}`;
}

function beginTimer() {
  timeLeft = 180;
  setTimerText(timeLeft);
  timerId = setInterval(() => {
    timeLeft -= 1;
    setTimerText(timeLeft);
    if (timeLeft <= 0) {
      endTest();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function calculateResults(inputText) {
  const typed = inputText.trim();
  let correctChars = 0;
  const reference = currentPrompt;
  const length = Math.min(typed.length, reference.length);

  for (let i = 0; i < length; i += 1) {
    if (typed[i] === reference[i]) {
      correctChars += 1;
    }
  }

  const wordsTyped = typed.length === 0 ? 0 : typed.split(/\s+/).filter(Boolean).length;
  const totalChars = typed.length;
  const accuracy = totalChars === 0 ? 0 : (correctChars / totalChars) * 100;
  const wpm = totalChars === 0 ? 0 : (wordsTyped / 3);

  return {
    correctChars,
    totalChars,
    wordsTyped,
    accuracy,
    wpm,
  };
}

function endTest() {
  if (!currentStudent) {
    return;
  }
  stopTimer();
  finishTestButton.disabled = true;
  testPanel.classList.add("hidden");
  nextParticipantButton.classList.remove("hidden");

  const { correctChars, totalChars, wordsTyped, accuracy, wpm } = calculateResults(typedText);
  resultName.textContent = currentStudent;
  resultWords.textContent = wordsTyped;
  resultWpm.textContent = wpm.toFixed(1);
  resultAccuracy.textContent = accuracy.toFixed(1);
  resultChars.textContent = totalChars;
  resultCorrect.textContent = correctChars;

  records.push({
    name: currentStudent,
    wpm,
    accuracy,
    paragraph: `All ${paragraphs.length}`,
    timestamp: Date.now(),
  });

  renderScoreboard();
  currentStudent = null;
}

function resetCompetition() {
  stopTimer();
  records = [];
  currentStudent = null;
  promptArea.textContent = "";
  typedText = "";
  currentIndex = 0;
  finishTestButton.disabled = true;
  nextParticipantButton.classList.add("hidden");
  registrationPanel.classList.remove("hidden");
  resultName.textContent = "-";
  resultWords.textContent = "-";
  resultWpm.textContent = "-";
  resultAccuracy.textContent = "-";
  resultChars.textContent = "-";
  resultCorrect.textContent = "-";
  paragraphNumberSpan.textContent = "0";
  setTimerText(180);
  renderScoreboard();
}

addParticipantButton.addEventListener("click", () => {
  const name = participantNameInput.value.trim();
  if (!name) {
    alert("Enter a student name before adding.");
    return;
  }
  if (students.includes(name)) {
    alert("That student name is already registered.");
    return;
  }
  students.push(name);
  updateStudentSelect();
  participantNameInput.value = "";
});

removeStudentButton.addEventListener("click", () => {
  const selected = studentSelectAdmin.value;
  if (!selected) {
    alert("Select a student to remove.");
    return;
  }
  students = students.filter((name) => name !== selected);
  updateStudentSelect();
  if (currentStudent === selected) {
    currentStudent = null;
  }
});

addParagraphButton.addEventListener("click", () => {
  if (!isAdmin) {
    alert("Only admin can add paragraphs.");
    return;
  }
  const paragraph = newParagraphInput.value.trim();
  if (!paragraph) {
    alert("Enter a paragraph before adding.");
    return;
  }
  paragraphs.push(paragraph);
  newParagraphInput.value = "";
  updateParagraphCount();
  saveState();
  alert("Paragraph added for participants.");
});

adminLoginButton.addEventListener("click", () => {
  const password = adminPasswordInput.value.trim();
  if (password === ADMIN_PASSWORD) {
    setAdminMode(true);
    alert("Admin mode enabled. You can add participants now.");
  } else {
    alert("Incorrect admin password.");
    setAdminMode(false);
  }
});

startTestButton.addEventListener("click", () => {
  const selected = studentSelectPublic.value;
  if (!selected) {
    alert("Select your student name from the list before starting the test.");
    return;
  }
  currentStudent = selected;
  choosePrompt();
  registrationPanel.classList.add("hidden");
  testPanel.classList.remove("hidden");
  nextParticipantButton.classList.add("hidden");
  promptArea.focus();
  finishTestButton.disabled = false;
  resultName.textContent = "-";
  resultWords.textContent = "-";
  resultWpm.textContent = "-";
  resultAccuracy.textContent = "-";
  resultChars.textContent = "-";
  resultCorrect.textContent = "-";
  beginTimer();
});

finishTestButton.addEventListener("click", () => {
  endTest();
});

clearInputButton.addEventListener("click", () => {
  typedText = "";
  currentIndex = 0;
  renderPromptText(currentPrompt);
  promptArea.focus();
});

promptArea.addEventListener("keydown", handleTypingKey);
promptArea.addEventListener("click", () => promptArea.focus());

resetAllButton.addEventListener("click", () => {
  if (!isAdmin) {
    alert("Only admin can reset the competition.");
    return;
  }
  if (confirm("Reset the entire competition and clear all scores?")) {
    resetCompetition();
    saveState();
  }
});

studentSelectAdmin.addEventListener("change", () => {
  participantNameInput.value = "";
});

nextParticipantButton.addEventListener("click", () => {
  typedText = "";
  currentIndex = 0;
  promptArea.textContent = "";
  testPanel.classList.add("hidden");
  registrationPanel.classList.remove("hidden");
  nextParticipantButton.classList.add("hidden");
  resultName.textContent = "-";
  resultWords.textContent = "-";
  resultWpm.textContent = "-";
  resultAccuracy.textContent = "-";
  resultChars.textContent = "-";
  resultCorrect.textContent = "-";
});

loadState();
updateStudentSelect();
updateParagraphCount();
setAdminMode(false);
setTimerText(180);
renderScoreboard();
