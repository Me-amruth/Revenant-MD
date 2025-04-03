const { Module } = require("../lib/modules");
const config = require("../config"); // Import SUDO list
const fs = require('fs');
const HANDLER = config.HANDLERS[0];
let jsonPath = './plugins/temp/quiz.json';

let activeQuizzes = new Map();
let isRandom = true;
let leaderboard = new Map();

const quiz = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const getRandomCategory = () => quiz.categories[Math.floor(Math.random() * quiz.categories.length)].name;
const getRandomQuestion = (category) => category.questions[Math.floor(Math.random() * category.questions.length)];

const askQuestion = async (m, categoryName) => {
    if (!activeQuizzes.has(m.jid)) return;

    const category = quiz.categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) return m.send("⚠️ Category not found! Use *.quiz* to see available categories.");

    let userData = activeQuizzes.get(m.jid);

    // Initialize askedQuestions if not present
    if (!userData.askedQuestions) {
        userData.askedQuestions = [];
    }

    // Get a new question that has not been asked
    let availableQuestions = category.questions.filter(q => !userData.askedQuestions.includes(q.question));

    // Reset askedQuestions if all questions were asked
    if (availableQuestions.length === 0) {
        userData.askedQuestions = [];
        availableQuestions = category.questions;
    }

    // Pick a random question from available questions
    let questionData = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // Store the asked question
    userData.askedQuestions.push(questionData.question);
    userData.question = questionData;

    m.send(`*📢 Question:*
${questionData.question}

*🔢 Options:*
1️⃣ ${questionData.options[0]}
2️⃣ ${questionData.options[1]}
3️⃣ ${questionData.options[2]}
4️⃣ ${questionData.options[3]}

*📊 Current Score: ${userData.score}*`);
};


const updateLeaderboard = (jid, score) => {
    leaderboard.set(jid, score);
};

const getLeaderboard = () => {
    let sorted = [...leaderboard.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.map(([jid, score], index) => `${index + 1}. ${jid.split('@')[0]} - ${score} points`).join("\n");
};

Module({
    pattern: "quiz",
    type: "quiz",
    desc: "Starts a quiz session",
    fromMe: false
}, async (m, match) => {
    let categoriesList = quiz.categories.map((cat, index) => `${index + 1}. ${cat.name}`).join("\n");

    if (match === "clear") {
        activeQuizzes.delete(m.jid);
        leaderboard.delete(m.jid);
        return m.send("🛑 Quiz cleared.");
    }

    if (match === "start") {
        let category = isRandom ? getRandomCategory() : activeQuizzes.get(m.jid)?.category || quiz.categories[0].name;
        if (!activeQuizzes.has(m.jid)) activeQuizzes.set(m.jid, { category, score: 0 });
        return askQuestion(m, category);
    }

    if (match === "rank") {
        return m.send(`🏆 *Quiz Leaderboard:*\n${getLeaderboard() || "No scores yet."}`);
    }

    if (match.startsWith("add=")) {
        const pattern = /^add=(\d+)#([^#]+)#([^#]+),([^#]+),([^#]+),([^#]+)#(\d)$/;
        const parsedMatch = match.match(pattern);

        if (parsedMatch) {
            const categoryIndex = parseInt(parsedMatch[1]) - 1; // Convert to 0-based index
            const question = parsedMatch[2].trim();
            const options = [parsedMatch[3].trim(), parsedMatch[4].trim(), parsedMatch[5].trim(), parsedMatch[6].trim()];
            const correctAnswerIndex = parseInt(parsedMatch[7]) - 1; // Convert to 0-based index

            // Check if category exists
            if (categoryIndex < 0 || categoryIndex >= quiz.categories.length) {
                return m.sendReply("⚠️ Invalid category number! Please enter a valid category.");
            }

            // Check if correct answer index is valid
            if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
                return m.sendReply("⚠️ Invalid answer number! It must be between 1 and 4.");
            }

            // Create the question object
            let newQuestion = {
                question: question,
                options: options,
                answer: options[correctAnswerIndex]
            };

            let data = fs.readFileSync(jsonPath, 'utf-8');
            let newQuiz = JSON.parse(data);

            // Add the question to the respective category
            newQuiz.categories[categoryIndex].questions.push(newQuestion);

            fs.writeFileSync(jsonPath, JSON.stringify(newQuiz, undefined, 2), 'utf-8');

            // Confirmation message
            m.sendReply(`✅ *Question Added Successfully!*\n\n📌 *Question:* ${newQuestion.question}\n🔢 *Options:* ${options.join(", ")}\n✅ *Correct Answer:* ${newQuestion.answer}`);
        } else {
            m.sendReply("⚠️ Invalid format! Please use:\n*add=catNo#question#op1,op2,op3,op4#ansNo*");
        }
    }


    if (match && !isNaN(match)) {
        let categoryIndex = Number(match) - 1;
        if (categoryIndex === -1) {
            isRandom = true;
            return m.send("✅ Category set to *Random*.");
        }
        if (categoryIndex < 0 || categoryIndex >= quiz.categories.length) {
            return m.send("⚠️ Invalid category number. Please select a valid category.");
        }

        let selectedCategory = quiz.categories[categoryIndex].name;
        isRandom = false;
        let userData = activeQuizzes.get(m.jid) || { score: 0 };
        activeQuizzes.set(m.jid, { category: selectedCategory, score: userData.score });
        return m.send(`✅ Category set to *${selectedCategory}*\nUse *${HANDLER}quiz start* to begin.`);
    }

    if (!match) {
        return m.send(
            `*📚 Quiz Help*\n\nAvailable commands:\n- ${HANDLER}quiz start - Start the quiz (Random category)\n- ${HANDLER}quiz clear - Clear quiz data\n- ${HANDLER}quiz [CategoryNumber] - Choose a specific category\n- ${HANDLER}quiz rank - Show quiz rankings\n\n*Available Categories:*\n0. Random\n${categoriesList}`
        );
    }
});

Module({
    on: "message",
    fromMe: false,
}, async (m) => {
    if (!activeQuizzes.has(m.jid) || !m?.quoted?.text || !m.quoted.text.includes("Question")) return;

    let quizData = activeQuizzes.get(m.jid);
    let questionData = quizData.question;
    let selectedIndex = parseInt(m.text.trim()) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= questionData.options.length) {
        return m.send("⚠️ Invalid option. Please reply with a number between 1 and 4.");
    }

    let selectedAnswer = questionData.options[selectedIndex];
    if (selectedAnswer === questionData.answer) {
        quizData.score += 2;
        updateLeaderboard(m.jid, quizData.score);
        await m.send(`✅ Correct! 🎉 You got *2 marks*\n*📊 Your Score: ${quizData.score}*`);
    } else {
        await m.send(`❌ Wrong! The correct answer was *${questionData.answer}*.`);
    }

    setTimeout(() => askQuestion(m, isRandom ? getRandomCategory() : quizData.category), 1000);
});
