// QWIZSET SKILL ASSESSMENT
const setupScreen = document.querySelector("#setup-screen");
const questionScreen = document.querySelector("#question-screen");
const resultsScreen = document.querySelector("#results-screen");
const skillSelectList = document.querySelector("#skill-select-list");
const startButton = document.querySelector("#start-assessment");
const examSidebar = document.querySelector("#exam-sidebar");

const questionText = document.querySelector("#question-text");
const optionsContainer = document.querySelector("#options-container");
const questionProgress = document.querySelector("#question-progress");
const skillLabel = document.querySelector("#skill-label");
const questionNumbers = document.querySelector("#question-numbers");
const timerDisplay = document.querySelector("#timer");

const previousButton = document.querySelector("#previous-question");
const nextButton = document.querySelector("#next-question");
const submitButton = document.querySelector("#submit-assessment");
const retakeButton = document.querySelector("#retake-assessment");

let questionBank = {};
let selectedSkill = "";
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timeLeft = 300; //5 minutes
let timerInterval = null;
let assessmentStarted = false;

async function loadQuestionBank() {
    try {
        const response = await fetch("qwiz.json");
        if (!response.ok) throw new Error("Could not load qwiz.json.");
        questionBank = await response.json();
        renderSkillChoices();

        const requestedSkill = new URLSearchParams(window.location.search).get("skill");
        if (requestedSkill && questionBank[requestedSkill]) {
            selectedSkill = requestedSkill;
            highlightSelectedSkill();
        }
    } catch (error) {
        setupScreen.innerHTML = `<h2 class="question-text">Unable to load assessments</h2>
            <p>Please make sure qwiz.json is in the same folder as practice.html and run the project with a local server.</p>`;
        console.error(error);
    }
}

function renderSkillChoices() {
    skillSelectList.innerHTML = "";
    Object.entries(questionBank).forEach(([key, skill]) => {
        const label = document.createElement("label");
        label.className = "skill-choice";
        label.innerHTML = `
            <input type="radio" name="skill" value="${key}">
            <span><strong>${skill.title}</strong><small>${skill.description}</small></span>
        `;
        label.querySelector("input").addEventListener("change", () => {
            selectedSkill = key;
            highlightSelectedSkill();
        });
        skillSelectList.appendChild(label);
    });
    highlightSelectedSkill();
}

function highlightSelectedSkill() {
    document.querySelectorAll(".skill-choice").forEach(choice => {
        const input = choice.querySelector("input");
        input.checked = input.value === selectedSkill;
        choice.classList.toggle("selected", input.checked);
    });
}

function startAssessment() {
    if (!selectedSkill || !questionBank[selectedSkill]) {
        alert("Please choose a skill area first.");
        return;
    }

    const skill = questionBank[selectedSkill];
    currentQuestions = skill.questions;
    currentQuestionIndex = 0;
    userAnswers = Array(currentQuestions.length).fill(null);
    timeLeft = skill.durationMinutes * 60;
    assessmentStarted = true;

    document.querySelector("#assessment-title").textContent = skill.title;
    document.querySelector("#assessment-subtitle").textContent = "Timed skill assessment";
    setupScreen.hidden = true;
    resultsScreen.hidden = true;
    questionScreen.hidden = false;
    examSidebar.hidden = false;
    renderQuestion();
    renderQuestionNavigation();
    startTimer();
}

function renderQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    questionProgress.textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    skillLabel.textContent = `Skill: ${questionBank[selectedSkill].title}`;
    questionText.textContent = question.question;
    optionsContainer.innerHTML = "";

    question.options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "option";
        label.innerHTML = `
            <input type="radio" name="answer" value="${index}">
            <span>${String.fromCharCode(65 + index)}. ${escapeHTML(option)}</span>
        `;
        const input = label.querySelector("input");
        input.checked = userAnswers[currentQuestionIndex] === index;
        input.addEventListener("change", () => {
            userAnswers[currentQuestionIndex] = index;
            renderQuestionNavigation();
        });
        optionsContainer.appendChild(label);
    });

    previousButton.disabled = currentQuestionIndex === 0;
    nextButton.textContent = currentQuestionIndex === currentQuestions.length - 1 ? "Review Answers" : "Next Question";
    renderQuestionNavigation();
}

function renderQuestionNavigation() {
    questionNumbers.innerHTML = "";
    currentQuestions.forEach((question, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = index + 1;
        if (index === currentQuestionIndex) button.classList.add("current");
        if (userAnswers[index] !== null) button.classList.add("answered");
        button.addEventListener("click", () => {
            currentQuestionIndex = index;
            renderQuestion();
        });
        questionNumbers.appendChild(button);
    });
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft -= 1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("Time is up. Your assessment will be submitted.");
            submitAssessment();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function submitAssessment() {
    if (!assessmentStarted) return;

    // Check for unanswered questions
    const firstUnansweredIndex = userAnswers.findIndex(
        answer => answer === null
    );

    // Block submission if any question is unanswered
    if (firstUnansweredIndex !== -1) {
        const unansweredCount = userAnswers.filter(
            answer => answer === null
        ).length;

        alert(
            `You have ${unansweredCount} unanswered question(s). Please complete them before submitting.`
        );

        // Take the user to the first unanswered question
        currentQuestionIndex = firstUnansweredIndex;
        renderQuestion();

        return;
    }

    // Submit only when every question has been answered
    clearInterval(timerInterval);
    assessmentStarted = false;
    showResults();
}

function showResults() {
    questionScreen.hidden = true;
    examSidebar.hidden = true;
    resultsScreen.hidden = false;

    const correctCount = currentQuestions.reduce((total, question, index) => {
        return total + (userAnswers[index] === question.answer ? 1 : 0);
    }, 0);
    const percentage = Math.round((correctCount / currentQuestions.length) * 100);

    document.querySelector("#result-skill-label").textContent = questionBank[selectedSkill].title;
    document.querySelector("#result-score").textContent = `${correctCount}/${currentQuestions.length} (${percentage}%)`;
    document.querySelector("#result-message").textContent =
        percentage >= 80 ? "Strong work. Keep building on what you know." :
        percentage >= 50 ? "Good effort. Review the explanations and keep practising." :
        "Use the review below to strengthen your understanding.";

    const review = document.querySelector("#answer-review");
    review.innerHTML = "";
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.answer;
        const item = document.createElement("article");
        item.className = `review-item ${isCorrect ? "correct" : "incorrect"}`;
        item.innerHTML = `
            <h3>Question ${index + 1}: ${escapeHTML(question.question)}</h3>
            <p><strong>Your answer:</strong> ${userAnswer === null ? "Not answered" : escapeHTML(question.options[userAnswer])}</p>
            <p><strong>Correct answer:</strong> ${escapeHTML(question.options[question.answer])}</p>
            <p>${escapeHTML(question.explanation)}</p>
        `;
        review.appendChild(item);
    });
}

function retakeAssessment() {
    clearInterval(timerInterval);
    setupScreen.hidden = false;
    resultsScreen.hidden = true;
    questionScreen.hidden = true;
    examSidebar.hidden = true;
    assessmentStarted = false;
    startAssessment();
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

startButton.addEventListener("click", event => {
    event.preventDefault();
    startAssessment();
});
previousButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex -= 1;
        renderQuestion();
    }
});
nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex += 1;
        renderQuestion();
    } else {
        const unanswered = userAnswers.filter(answer => answer === null).length;
        const message = unanswered
            ? `You still have ${unanswered} unanswered question(s). You can go back and answer them, or submit now.`
            : "You have reached the end of the assessment. Submit your answers now?";
        if (confirm(message)) submitAssessment();
    }
});
submitButton.addEventListener("click", submitAssessment);
retakeButton.addEventListener("click", retakeAssessment);

loadQuestionBank();
