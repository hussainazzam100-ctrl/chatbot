
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================================
    // Shared helpers
    // =========================================================

    const API_BASE_URL =
        typeof API_URL === "string" ? API_URL.replace(/\/+$/, "") : "";

    function getApiUrl(path) {
        if (!API_BASE_URL) {
            throw new Error("API_URL is missing from config.js.");
        }

        return `${API_BASE_URL}${path}`;
    }

    async function readJsonResponse(response) {
        const text = await response.text();

        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error("The server returned invalid JSON.");
        }

        if (!response.ok) {
            const detail = typeof data.detail === "string"
                ? data.detail
                : `HTTP ${response.status}`;

            throw new Error(detail);
        }

        return data;
    }

    // =========================================================
    // Species explorer
    // =========================================================

    // Seven species: Mallard intentionally removed.
    const species = [
        {
            name: "Mandarin duck",
            scientific: "Aix galericulata",
            group: "perching",
            label: "The colourful one",
            range: "Native to East Asia, especially China, Japan, Korea, and eastern Russia; introduced populations occur elsewhere.",
            habitat: "Wooded lakes, forest streams, and wetlands with trees near the water.",
            diet: "Seeds, acorns, grains, aquatic plants, and small invertebrates.",
            fact: "Breeding males have elaborate, colourful plumage and distinctive orange sail-like feathers. They often perch in trees.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Mandarin.duck.arp.jpg",
            alt: "Colourful male Mandarin duck"
        },
        {
            name: "Wood duck",
            scientific: "Aix sponsa",
            group: "perching",
            label: "The tree nester",
            range: "North America, particularly wooded regions of the eastern United States and the Pacific Northwest.",
            habitat: "Wooded swamps, ponds, marshes, and slow-moving waterways.",
            diet: "Acorns, seeds, fruits, aquatic plants, and insects.",
            fact: "Wood ducks nest in tree cavities. Ducklings leave the nest soon after hatching and jump to the ground under their mother's guidance.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Wood_Duck_Male.jpg",
            alt: "Male wood duck"
        },
        {
            name: "Northern pintail",
            scientific: "Anas acuta",
            group: "dabbling",
            label: "The long-tailed traveller",
            range: "Breeds across northern parts of Eurasia and North America; many populations migrate south for winter.",
            habitat: "Shallow wetlands, marshes, tundra pools, flooded fields, and coastal lagoons.",
            diet: "Seeds and aquatic plants, with insects and other invertebrates especially important at some times of year.",
            fact: "Its long, pointed tail gives the species its name. Northern pintails often feed by tipping forward in shallow water.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Northern_Pintail.jpg",
            alt: "Northern pintail duck"
        },
        {
            name: "Muscovy duck",
            scientific: "Cairina moschata",
            group: "other",
            label: "The unusual one",
            range: "Native to the tropical Americas; domesticated populations are widespread around the world.",
            habitat: "Forested wetlands, rivers, swamps, and water-rich tropical areas.",
            diet: "Plant material, seeds, fruit, insects, and small aquatic animals.",
            fact: "Muscovy ducks have distinctive red facial caruncles. Unlike most familiar domestic ducks, they are descended from a different wild species.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Muscovy_Duck.jpg",
            alt: "Muscovy duck"
        },
        {
            name: "Northern shoveler",
            scientific: "Spatula clypeata",
            group: "dabbling",
            label: "The filter feeder",
            range: "Breeds across northern Eurasia and North America; migrates to milder regions for winter.",
            habitat: "Shallow freshwater wetlands, marshes, ponds, and sheltered lagoons.",
            diet: "Small aquatic invertebrates, seeds, and plant material filtered from water.",
            fact: "Its oversized, spoon-shaped bill has fine comb-like structures that help filter food from water.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Northern_Shoveler.jpg",
            alt: "Northern shoveler duck"
        },
        {
            name: "American wigeon",
            scientific: "Mareca americana",
            group: "dabbling",
            label: "The grazing duck",
            range: "Breeds mainly in North America and winters farther south, including parts of Central America.",
            habitat: "Marshes, shallow lakes, estuaries, and flooded fields.",
            diet: "Aquatic plants, grasses, seeds, and some invertebrates.",
            fact: "American wigeons often graze on land and may take vegetation from the water's edge or steal plants brought up by diving birds.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/American_Wigeon.jpg",
            alt: "American wigeon duck"
        },
        {
            name: "Harlequin duck",
            scientific: "Histrionicus histrionicus",
            group: "diving",
            label: "The rough-water specialist",
            range: "North Pacific and parts of the North Atlantic, with breeding in northern regions.",
            habitat: "Fast-flowing rocky streams during breeding and exposed, rocky coastlines in winter.",
            diet: "Aquatic invertebrates such as insects, crustaceans, and molluscs.",
            fact: "Harlequin ducks are adapted to rough water and can dive and manoeuvre around rocks in turbulent streams and coastal surf.",
            image: "https://commons.wikimedia.org/wiki/Special:FilePath/Harlequin_Duck.jpg",
            alt: "Harlequin duck"
        }
    ];

    const speciesGrid = document.getElementById("species-grid");
    const speciesSearch = document.getElementById("species-search");
    const speciesFilter = document.getElementById("species-filter");
    const speciesCount = document.getElementById("species-count");
    const speciesEmpty = document.getElementById("species-empty");

    function renderSpecies() {
        if (!speciesGrid) return;

        const query = (speciesSearch?.value || "").trim().toLowerCase();
        const group = speciesFilter?.value || "all";

        const filtered = species.filter((bird) => {
            const searchable = [
                bird.name,
                bird.scientific,
                bird.group,
                bird.label,
                bird.range,
                bird.habitat,
                bird.diet,
                bird.fact
            ].join(" ").toLowerCase();

            return searchable.includes(query) &&
                (group === "all" || bird.group === group);
        });

        speciesGrid.replaceChildren();

        filtered.forEach((bird) => {
            const article = document.createElement("article");
            article.className = "species-card";

            const imageWrap = document.createElement("div");
            imageWrap.className = "species-image";

            const img = document.createElement("img");
            img.src = bird.image;
            img.alt = bird.alt;
            img.loading = "lazy";

            img.onerror = () => {
                img.remove();
                imageWrap.classList.add("image-fallback");
                imageWrap.textContent = "✳";
                imageWrap.setAttribute(
                    "aria-label",
                    `${bird.name} image unavailable`
                );
            };

            imageWrap.appendChild(img);

            const content = document.createElement("div");
            content.className = "species-content";

            const category = document.createElement("p");
            category.className = "species-category";
            category.textContent = bird.label;

            const heading = document.createElement("h3");
            heading.textContent = bird.name;

            const scientific = document.createElement("p");
            scientific.className = "scientific-name";
            scientific.textContent = bird.scientific;

            const summary = document.createElement("p");
            summary.className = "species-short";
            summary.textContent = bird.fact;

            const details = document.createElement("details");
            details.className = "species-details";

            const summaryToggle = document.createElement("summary");
            summaryToggle.textContent = "Field notes";

            const detailContent = document.createElement("div");

            [
                ["Range", bird.range],
                ["Habitat", bird.habitat],
                ["Diet", bird.diet]
            ].forEach(([label, value]) => {
                const p = document.createElement("p");
                const strong = document.createElement("strong");

                strong.textContent = `${label}: `;
                p.append(strong, document.createTextNode(value));
                detailContent.appendChild(p);
            });

            details.append(summaryToggle, detailContent);
            content.append(category, heading, scientific, summary, details);
            article.append(imageWrap, content);
            speciesGrid.appendChild(article);
        });

        if (speciesCount) {
            speciesCount.textContent =
                `Showing ${filtered.length} of ${species.length} species`;
        }

        speciesEmpty?.classList.toggle("hidden", filtered.length !== 0);
    }

    speciesSearch?.addEventListener("input", renderSpecies);
    speciesFilter?.addEventListener("change", renderSpecies);
    renderSpecies();

    // =========================================================
    // FastAPI chatbot
    // =========================================================

    const chatbotContainer = document.getElementById("chatbot-container");
    const closeBtn = document.getElementById("close-btn");
    const chatbotForm = document.getElementById("chatbot-input-container");
    const sendBtn = document.getElementById("send-btn");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotMessages = document.getElementById("chatbot-messages");
    const chatbotIcon = document.getElementById("chatbot-icon");
    const chatbotBody = document.getElementById("chatbot-body");

    let hasGreeted = false;
    let requestInProgress = false;
    let audioCtx = null;
    let typingElement = null;

    function playQuack() {
        try {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) return;

            if (!audioCtx) audioCtx = new AudioContextClass();

            if (audioCtx.state === "suspended") {
                audioCtx.resume().catch(() => {});
            }

            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = "sawtooth";
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1200, now);

            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.11);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (error) {
            console.warn("Quack sound unavailable:", error);
        }
    }

    function appendMessage(sender, message) {
        if (!chatbotMessages) return null;

        const element = document.createElement("div");
        element.className = `message ${sender}`;
        element.textContent = String(message ?? "");

        chatbotMessages.appendChild(element);

        if (chatbotBody) {
            chatbotBody.scrollTop = chatbotBody.scrollHeight;
        } else {
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }

        return element;
    }

    function openChat(question = "") {
        if (!chatbotContainer) return;

        chatbotContainer.classList.remove("hidden");
        chatbotIcon?.classList.add("hidden");
        playQuack();

        if (!hasGreeted) {
            hasGreeted = true;

            appendMessage(
                "bot",
                "Quack! I'm Quack.ai, your duck-focused companion. Ask me about duck species, habitats, diets, behaviour, ducklings, or a curious duck fact."
            );
        }

        if (question && chatbotInput) {
            chatbotInput.value = question;
            sendMessage();
        } else {
            chatbotInput?.focus();
        }
    }

    function closeChat() {
        chatbotContainer?.classList.add("hidden");
        chatbotIcon?.classList.remove("hidden");
        chatbotIcon?.focus();
    }

    chatbotIcon?.addEventListener("click", () => openChat());

    document.querySelectorAll("[data-open-chat]").forEach((element) => {
        element.addEventListener("click", () => openChat());
    });

    document.querySelectorAll("[data-question]").forEach((element) => {
        element.addEventListener("click", () => {
            openChat(element.dataset.question || "");
        });
    });

    closeBtn?.addEventListener("click", closeChat);

    function setTyping(show) {
        if (show) {
            if (!typingElement) {
                typingElement = appendMessage("system", "Quack is thinking…");
            }
        } else {
            typingElement?.remove();
            typingElement = null;
        }
    }

    async function getBotResponse(userMessage) {
        if (requestInProgress) return;

        requestInProgress = true;
        if (sendBtn) sendBtn.disabled = true;

        setTyping(true);

        try {
            const response = await fetch(getApiUrl("/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await readJsonResponse(response);

            if (typeof data.response !== "string" || !data.response.trim()) {
                throw new Error("The API returned an unexpected response.");
            }

            setTyping(false);
            appendMessage("bot", data.response);
        } catch (error) {
            console.error("Chat API error:", error);
            setTyping(false);

            appendMessage(
                "bot",
                "I'm having trouble reaching my duck knowledge base right now. Please try again in a moment."
            );
        } finally {
            requestInProgress = false;
            if (sendBtn) sendBtn.disabled = false;
            chatbotInput?.focus();
        }
    }

    function sendMessage() {
        if (!chatbotInput || requestInProgress) return;

        const message = chatbotInput.value.trim();
        if (!message) return;

        appendMessage("user", message);
        chatbotInput.value = "";
        getBotResponse(message);
    }

    chatbotForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        sendMessage();
    });

    // =========================================================
    // Ten-question quiz
    // =========================================================

    const questions = [
        {
            question: "What is a duck, biologically speaking?",
            options: [
                "A mammal related to otters",
                "A water-associated bird in the family Anatidae",
                "A type of amphibian",
                "A flightless reptile"
            ],
            answer: 1,
            explanation: "Ducks are birds in the family Anatidae, which also includes geese and swans."
        },
        {
            question: "What helps many ducks paddle efficiently?",
            options: [
                "Webbed feet",
                "A flat tail used as an oar",
                "Hollow toes filled with air",
                "Feathers between their bills"
            ],
            answer: 0,
            explanation: "Webbing between the toes helps many ducks push against water."
        },
        {
            question: "Which duck is known for a broad, spoon-shaped bill?",
            options: [
                "Harlequin duck",
                "Wood duck",
                "Northern shoveler",
                "Muscovy duck"
            ],
            answer: 2,
            explanation: "The northern shoveler's broad bill helps it filter food from water."
        },
        {
            question: "What does a dabbling duck commonly do when feeding?",
            options: [
                "Digs deep underground",
                "Tips forward to reach food underwater",
                "Catches fish only by diving",
                "Climbs trees to find insects"
            ],
            answer: 1,
            explanation: "Dabbling ducks often feed in shallow water by tipping forward with their tails up."
        },
        {
            question: "What is the scientific name of the Mandarin duck?",
            options: [
                "Aix sponsa",
                "Cairina moschata",
                "Aix galericulata",
                "Histrionicus histrionicus"
            ],
            answer: 2,
            explanation: "The Mandarin duck's scientific name is Aix galericulata."
        },
        {
            question: "Where do wood ducks commonly nest?",
            options: [
                "In underground burrows",
                "In tree cavities",
                "On bare ocean cliffs only",
                "Inside floating reed nests only"
            ],
            answer: 1,
            explanation: "Wood ducks nest in tree cavities, often near wetlands."
        },
        {
            question: "Which food is generally a poor choice for feeding wild ducks?",
            options: [
                "Appropriate aquatic vegetation",
                "Naturally available invertebrates",
                "Bread as a regular food source",
                "Seeds found naturally in their habitat"
            ],
            answer: 2,
            explanation: "Bread is not nutritionally balanced for ducks and can contribute to poor feeding habits. Follow local wildlife guidance."
        },
        {
            question: "What is a major reason many duck species migrate?",
            options: [
                "To find seasonal food and suitable breeding or wintering habitat",
                "Because all ducks cannot swim in winter",
                "To change into a different species",
                "To avoid drinking water"
            ],
            answer: 0,
            explanation: "Migration can help ducks reach suitable food, weather, and breeding conditions."
        },
        {
            question: "Which duck is especially associated with rocky coasts and fast-flowing streams?",
            options: [
                "American wigeon",
                "Northern pintail",
                "Harlequin duck",
                "Northern shoveler"
            ],
            answer: 2,
            explanation: "Harlequin ducks are adapted to turbulent streams during breeding and rocky coastal waters in winter."
        },
        {
            question: "What should you do if you find a wild duckling alone?",
            options: [
                "Take it home immediately",
                "Feed it bread and milk",
                "Keep your distance and check whether a parent is nearby; contact a wildlife professional if it appears injured or truly orphaned",
                "Release it in the nearest roadside puddle"
            ],
            answer: 2,
            explanation: "A duckling may have a parent nearby. Avoid unnecessary handling and seek local wildlife advice if it appears injured or abandoned."
        }
    ];

    const quizStart = document.getElementById("quiz-start");
    const quizPlay = document.getElementById("quiz-play");
    const quizResult = document.getElementById("quiz-result");
    const quizName = document.getElementById("quiz-name");
    const quizNameError = document.getElementById("quiz-name-error");
    const startQuizBtn = document.getElementById("start-quiz");
    const questionTitle = document.getElementById("quiz-question");
    const optionsContainer = document.getElementById("quiz-options");
    const progressLabel = document.getElementById("quiz-progress-label");
    const scoreLabel = document.getElementById("quiz-score-label");
    const progress = document.getElementById("quiz-progress");
    const progressFill = document.getElementById("quiz-progress-fill");
    const feedback = document.getElementById("quiz-feedback");
    const nextQuestionBtn = document.getElementById("next-question");
    const playAgainBtn = document.getElementById("play-again");
    const resultScore = document.getElementById("result-score");
    const resultTitle = document.getElementById("result-title");
    const resultMessage = document.getElementById("result-message");
    const submitStatus = document.getElementById("leaderboard-submit-status");

    let currentQuestion = 0;
    let score = 0;
    let selectedName = "";
    let questionAnswered = false;
    let quizFinished = false;
    let submissionAttempted = false;

    function showQuizPanel(panel) {
        [quizStart, quizPlay, quizResult].forEach((item) => {
            item?.classList.add("hidden");
        });

        panel?.classList.remove("hidden");
    }

    function startQuiz() {
        const name = (quizName?.value || "")
            .trim()
            .replace(/\s+/g, " ");

        if (!name || name.length > 24) {
            if (quizNameError) {
                quizNameError.textContent = !name
                    ? "Please enter your name to start."
                    : "Your name must be 24 characters or fewer.";

                quizNameError.classList.remove("hidden");
            }

            quizName?.focus();
            return;
        }

        quizNameError?.classList.add("hidden");

        selectedName = name;
        currentQuestion = 0;
        score = 0;
        questionAnswered = false;
        quizFinished = false;
        submissionAttempted = false;

        if (submitStatus) submitStatus.textContent = "";

        showQuizPanel(quizPlay);
        renderQuestion();
    }

    function renderQuestion() {
        const item = questions[currentQuestion];

        if (
            !item ||
            !progressLabel ||
            !scoreLabel ||
            !progressFill ||
            !questionTitle ||
            !optionsContainer ||
            !feedback ||
            !nextQuestionBtn
        ) {
            console.error("Quiz HTML is missing one or more required elements.");
            return;
        }

        questionAnswered = false;

        progressLabel.textContent =
            `QUESTION ${currentQuestion + 1} OF ${questions.length}`;

        scoreLabel.textContent = `Score: ${score}`;

        progressFill.style.width =
            `${(currentQuestion / questions.length) * 100}%`;

        progress?.setAttribute("aria-valuenow", String(currentQuestion));

        questionTitle.textContent = item.question;
        optionsContainer.replaceChildren();

        feedback.textContent = "";
        feedback.className = "quiz-feedback";

        nextQuestionBtn.classList.add("hidden");

        item.options.forEach((option, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "quiz-option";

            const letter = document.createElement("span");
            letter.className = "option-letter";
            letter.textContent = String.fromCharCode(65 + index);

            const label = document.createElement("span");
            label.textContent = option;

            button.append(letter, label);

            button.addEventListener("click", () => selectAnswer(index));

            optionsContainer.appendChild(button);
        });
    }

    function selectAnswer(selectedIndex) {
        if (questionAnswered || quizFinished) return;

        const item = questions[currentQuestion];
        if (!item) return;

        questionAnswered = true;

        const buttons = [
            ...optionsContainer.querySelectorAll(".quiz-option")
        ];

        buttons.forEach((button) => {
            button.disabled = true;
        });

        buttons[item.answer]?.classList.add("correct");

        if (selectedIndex === item.answer) {
            score += 1;
            feedback.textContent = `Correct! ${item.explanation}`;
            feedback.classList.add("is-correct");
        } else {
            buttons[selectedIndex]?.classList.add("incorrect");
            feedback.textContent = `Not quite. ${item.explanation}`;
            feedback.classList.add("is-wrong");
        }

        scoreLabel.textContent = `Score: ${score}`;

        progressFill.style.width =
            `${((currentQuestion + 1) / questions.length) * 100}%`;

        progress?.setAttribute(
            "aria-valuenow",
            String(currentQuestion + 1)
        );

        nextQuestionBtn.textContent =
            currentQuestion === questions.length - 1
                ? "See my result →"
                : "Next question →";

        nextQuestionBtn.classList.remove("hidden");
        nextQuestionBtn.focus();
    }

    function finishQuiz() {
        if (quizFinished) return;

        quizFinished = true;
        showQuizPanel(quizResult);

        if (resultScore) resultScore.textContent = `${score}/10`;

        if (score === 10) {
            if (resultTitle) resultTitle.textContent = "Master of the pond.";
            if (resultMessage) {
                resultMessage.textContent =
                    "A perfect score! You know your ducks remarkably well.";
            }
        } else if (score >= 7) {
            if (resultTitle) {
                resultTitle.textContent = "A sharp-eyed duck detective.";
            }
            if (resultMessage) {
                resultMessage.textContent =
                    "Great work. You've got a solid grasp of duck life.";
            }
        } else if (score >= 4) {
            if (resultTitle) {
                resultTitle.textContent = "A curious pond explorer.";
            }
            if (resultMessage) {
                resultMessage.textContent =
                    "A good start. Explore the species guide and come back to beat your score.";
            }
        } else {
            if (resultTitle) {
                resultTitle.textContent = "Every expert starts somewhere.";
            }
            if (resultMessage) {
                resultMessage.textContent =
                    "Have a look around the species guide, then give the quiz another go.";
            }
        }

        submitScore();
    }

    async function submitScore() {
    if (submissionAttempted) return;
    submissionAttempted = true;

    if (submitStatus) {
        submitStatus.textContent = "Submitting your score…";
    }

    try {
        if (typeof API_URL !== "string" || !API_URL.trim()) {
            throw new Error("API_URL is missing from config.js.");
        }

        const response = await fetch(
            `${API_URL.replace(/\/+$/, "")}/leaderboard`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: selectedName,
                    score: score
                })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || `Score submission failed: HTTP ${response.status}`
            );
        }

        if (submitStatus) {
            submitStatus.textContent =
                "Your score has been submitted! Refreshing the leaderboard…";
        }

        await loadLeaderboard();

        if (submitStatus) {
            submitStatus.textContent = "Your score has been submitted!";
        }
    } catch (error) {
        console.error("Leaderboard submission failed:", error);

        if (submitStatus) {
            submitStatus.textContent =
                "Your quiz is complete, but your score could not be saved. Please try again later.";
        }
    }
}

    function resetQuiz() {
        showQuizPanel(quizStart);
        quizNameError?.classList.add("hidden");

        if (submitStatus) submitStatus.textContent = "";

        quizName?.focus();
    }

    startQuizBtn?.addEventListener("click", startQuiz);

    quizName?.addEventListener("input", () => {
        quizNameError?.classList.add("hidden");
    });

    nextQuestionBtn?.addEventListener("click", () => {
        if (!questionAnswered || quizFinished) return;

        if (currentQuestion < questions.length - 1) {
            currentQuestion += 1;
            renderQuestion();
            questionTitle?.focus();
        } else {
            finishQuiz();
        }
    });

    playAgainBtn?.addEventListener("click", resetQuiz);

// =========================================================
// Shared leaderboard — entries come from the FastAPI server
// =========================================================

const leaderboardBody = document.getElementById("leaderboard-body");
const leaderboardNote = document.getElementById("leaderboard-note");
const refreshLeaderboardBtn =
    document.getElementById("refresh-leaderboard");

let leaderboardLoading = false;

function renderLeaderboardRows(entries) {
    if (!leaderboardBody) return;

    leaderboardBody.replaceChildren();

    if (entries.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.className = "table-message";
        cell.textContent =
            "The pond is quiet for now. Complete the quiz to claim the first spot!";

        row.appendChild(cell);
        leaderboardBody.appendChild(row);
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement("tr");

        const rankCell = document.createElement("td");
        const nameCell = document.createElement("td");
        const scoreCell = document.createElement("td");
        const dateCell = document.createElement("td");

        rankCell.textContent = String(entry.rank ?? index + 1);
        nameCell.textContent = String(entry.name ?? "Anonymous");

        const playerScore = Number(entry.score);
        scoreCell.textContent = Number.isFinite(playerScore)
            ? `${playerScore}/10`
            : "—";

        if (entry.created_at) {
            // Handles ISO dates with or without an explicit timezone.
            const rawDate = String(entry.created_at || "");
            const date = new Date(
                 /(?:Z|[+-]\d{2}:\d{2})$/i.test(rawDate)
                   ? rawDate
                   : `${rawDate}Z`
            );

            dateCell.textContent = Number.isNaN(date.getTime())
                ? String(entry.created_at)
                : date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
        } else {
            dateCell.textContent = "—";
        }

        row.append(rankCell, nameCell, scoreCell, dateCell);
        leaderboardBody.appendChild(row);
    });
}

async function loadLeaderboard() {
    if (leaderboardLoading || !leaderboardBody) return;

    if (typeof API_URL !== "string" || !API_URL.trim()) {
        if (leaderboardNote) {
            leaderboardNote.textContent =
                "The API URL is missing from config.js.";
        }
        return;
    }

    leaderboardLoading = true;

    if (refreshLeaderboardBtn) {
        refreshLeaderboardBtn.disabled = true;
    }

    if (leaderboardNote) {
        leaderboardNote.textContent = "Loading leaderboard…";
    }

    try {
        const response = await fetch(
            `${API_URL.replace(/\/+$/, "")}/leaderboard`,
            { cache: "no-store" }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.detail || `Leaderboard returned HTTP ${response.status}.`
            );
        }

        const entries = Array.isArray(data)
            ? data
            : data.entries ?? data.leaderboard;

        if (!Array.isArray(entries)) {
            throw new Error(
                "Unexpected response. The API should return an entries array."
            );
        }

        // Highest scores first; the server should also apply this ordering.
        const sortedEntries = [...entries].sort(
            (a, b) => Number(b.score) - Number(a.score)
        );

        renderLeaderboardRows(sortedEntries);

        if (leaderboardNote) {
            leaderboardNote.textContent = sortedEntries.length
                ? `Showing ${sortedEntries.length} saved quiz results.`
                : "No scores yet. Complete the quiz to be the first on the board!";
        }
    } catch (error) {
        console.error("Could not load leaderboard:", error);

        leaderboardBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.className = "table-message";
        cell.textContent =
            "The leaderboard is temporarily unavailable. Please try refreshing.";

        row.appendChild(cell);
        leaderboardBody.appendChild(row);

        if (leaderboardNote) {
            leaderboardNote.textContent = error.message;
        }
    } finally {
        leaderboardLoading = false;

        if (refreshLeaderboardBtn) {
            refreshLeaderboardBtn.disabled = false;
        }
    }
}

refreshLeaderboardBtn?.addEventListener("click", loadLeaderboard);

// Load existing saved scores when the page opens.
loadLeaderboard();
});
