// QWIZSET SKILL ASSESSMENT
const setupScreen = document.querySelector("#setup-screen");
const questionScreen = document.querySelector("#question-screen");
const reviewScreen = document.querySelector("#review-screen");
const resultsScreen = document.querySelector("#results-screen");
const skillSelectList = document.querySelector("#skill-select-list");
const startButton = document.querySelector("#start-assessment");
const examSidebar = document.querySelector("#exam-sidebar");
const reviewSummary = document.querySelector("#review-summary");
const reviewQuestionList = document.querySelector("#review-question-list");
const reviewBackButton = document.querySelector("#review-back-button");
const reviewSubmitButton = document.querySelector("#review-submit-button");

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
const confirmationDialog = document.querySelector("#confirmation-dialog");
const confirmationTitle = document.querySelector("#confirmation-title");
const confirmationMessage = document.querySelector("#confirmation-message");
const confirmationCancel = document.querySelector("#confirmation-cancel");
const confirmationAccept = document.querySelector("#confirmation-accept");

let questionBank = {};
let selectedSkill = "";
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timeLeft = 300; //5 minutes
let timerInterval = null;
let assessmentStarted = false;

function animateAssessmentScreen(screen) {
    screen.classList.remove("screen-enter");
    requestAnimationFrame(() => screen.classList.add("screen-enter"));
}

function showConfirmationCard({
    title,
    message,
    confirmText = "OK",
    cancelText = "No",
    showCancel = false
}) {
    confirmationTitle.textContent = title;
    confirmationMessage.textContent = message;
    confirmationAccept.textContent = confirmText;
    confirmationCancel.textContent = cancelText;
    confirmationCancel.hidden = !showCancel;

    return new Promise(resolve => {
        confirmationDialog.addEventListener(
            "close",
            () => resolve(confirmationDialog.returnValue === "confirm"),
            { once: true }
        );
        confirmationDialog.showModal();
    });
}

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
        showConfirmationCard({
            title: "Choose a skill",
            message: "Please choose a skill area first."
        });
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
    reviewScreen.hidden = true;
    questionScreen.hidden = false;
    animateAssessmentScreen(questionScreen);
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
            goToQuestion(index);
        });
        questionNumbers.appendChild(button);
    });
}

function showAnswerReview() {
    questionScreen.hidden = true;
    reviewScreen.hidden = false;

    const answeredCount = userAnswers.filter(answer => answer !== null).length;
    const unansweredCount = userAnswers.length - answeredCount;
    document.querySelector("#review-skill-label").textContent =
        questionBank[selectedSkill].title;
    reviewSummary.textContent =
        `${answeredCount} of ${userAnswers.length} answered` +
        (unansweredCount ? ` · ${unansweredCount} unanswered` : " · All questions answered");

    reviewQuestionList.innerHTML = "";
    currentQuestions.forEach((question, index) => {
        const answer = userAnswers[index];
        const item = document.createElement("article");
        item.className = `review-question ${answer === null ? "unanswered" : "answered"}`;

        const heading = document.createElement("h3");
        heading.textContent = `Question ${index + 1}`;

        const prompt = document.createElement("p");
        prompt.className = "review-question-prompt";
        prompt.textContent = question.question;

        const response = document.createElement("p");
        response.className = "review-question-answer";
        response.textContent = answer === null
            ? "Not answered"
            : `Your answer: ${question.options[answer]}`;

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "review-edit-button";
        editButton.textContent = "Change answer";
        editButton.setAttribute("aria-label", `Change answer to question ${index + 1}`);
        editButton.addEventListener("click", () => goToQuestion(index, true));

        item.append(heading, prompt, response, editButton);
        reviewQuestionList.appendChild(item);
    });
    animateAssessmentScreen(reviewScreen);
}

function goToQuestion(index, shouldAnimate = false) {
    currentQuestionIndex = index;
    reviewScreen.hidden = true;
    questionScreen.hidden = false;
    renderQuestion();
    if (shouldAnimate) animateAssessmentScreen(questionScreen);
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft -= 1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAssessment(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function submitAssessment(timeExpired = false) {
    if (!assessmentStarted) return;
    if (timeExpired && confirmationDialog.open) {
        confirmationDialog.close("cancel");
    }

    // Check for unanswered questions
    const firstUnansweredIndex = userAnswers.findIndex(
        answer => answer === null
    );

    // Block submission if any question is unanswered
    if (!timeExpired && firstUnansweredIndex !== -1) {
        const unansweredCount = userAnswers.filter(
            answer => answer === null
        ).length;

        // Take the user to the first unanswered question
        goToQuestion(firstUnansweredIndex);

        showConfirmationCard({
            title: "Questions unanswered",
            message: `You have ${unansweredCount} unanswered question(s). Please complete them before submitting.`
        });
        return;
    }

    clearInterval(timerInterval);
    assessmentStarted = false;
    showResults();
}

function showResults() {
    questionScreen.hidden = true;
    reviewScreen.hidden = true;
    examSidebar.hidden = true;
    resultsScreen.hidden = false;

    const correctCount = currentQuestions.reduce((total, question, index) => {
        return total + (userAnswers[index] === question.answer ? 1 : 0);
    }, 0);
    const percentage = Math.round((correctCount / currentQuestions.length) * 100);

    document.querySelector("#result-skill-label").textContent = questionBank[selectedSkill].title;
    const resultCelebration = document.querySelector("#result-celebration");
    const resultHeading = document.querySelector("#result-heading");
    const resultKicker = document.querySelector("#result-kicker");
    const resultBadge = document.querySelector("#result-badge");
    const resultScore = document.querySelector("#result-score");
    const scoreRing = document.querySelector("#result-score-ring");
    resultCelebration.classList.remove("excellent", "good", "keep-going");

    if (percentage >= 80) {
        resultCelebration.classList.add("excellent");
        resultKicker.textContent = "BRILLIANT WORK";
        resultHeading.textContent = "You nailed it!";
        resultBadge.textContent = percentage === 100 ? "Qwizset Pro" : "On a Roll";
    } else if (percentage >= 50) {
        resultCelebration.classList.add("good");
        resultKicker.textContent = "GREAT PROGRESS";
        resultHeading.textContent = "You're getting there!";
        resultBadge.textContent = "Skill Builder";
    } else {
        resultCelebration.classList.add("keep-going");
        resultKicker.textContent = "EVERY TRY COUNTS";
        resultHeading.textContent = "Keep building your skills!";
        resultBadge.textContent = "Keep Growing";
    }

    scoreRing.style.setProperty("--score-progress", `${percentage}%`);
    scoreRing.setAttribute(
        "aria-label",
        `Assessment score: ${percentage} percent, ${correctCount} of ${currentQuestions.length} correct`
    );
    animateResultScore(resultScore, percentage);
    document.querySelector("#result-correct-count").textContent =
        `${correctCount} of ${currentQuestions.length} questions correct`;
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

function animateResultScore(scoreElement, targetScore) {
    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
        scoreElement.textContent = `${targetScore}%`;
        return;
    }

    const duration = 1000;
    const startTime = performance.now();

    function updateScore(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easedProgress = 1 - (1 - progress) ** 3;
        scoreElement.textContent = `${Math.round(targetScore * easedProgress)}%`;

        if (progress < 1) {
            requestAnimationFrame(updateScore);
        }
    }

    scoreElement.textContent = "0%";
    requestAnimationFrame(updateScore);
}

function retakeAssessment() {
    clearInterval(timerInterval);
    setupScreen.hidden = false;
    resultsScreen.hidden = true;
    reviewScreen.hidden = true;
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
        showAnswerReview();
    }
});
submitButton.addEventListener("click", requestSubmissionConfirmation);
reviewBackButton.addEventListener("click", () => {
    reviewScreen.hidden = true;
    questionScreen.hidden = false;
    renderQuestion();
    animateAssessmentScreen(questionScreen);
});
reviewSubmitButton.addEventListener("click", requestSubmissionConfirmation);
retakeButton.addEventListener("click", retakeAssessment);

function requestSubmissionConfirmation() {
    showConfirmationCard({
        title: "Submit assessment?",
        message: "Are you sure you want to submit your assessment?",
        confirmText: "Yes",
        cancelText: "No",
        showCancel: true
    }).then(confirmed => {
        if (confirmed) submitAssessment();
    });
}

animateAssessmentScreen(setupScreen);
loadQuestionBank();
