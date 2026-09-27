document.addEventListener("DOMContentLoaded", function () {
    const chatbotContainer = document.getElementById("chatbot-container");
    const closeBtn = document.getElementById("close-btn");
    const sendBtn = document.getElementById("send-btn");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotMessages = document.getElementById("chatbot-messages");
    const chatbotIcon = document.getElementById("chatbot-icon");

    let hasGreeted = false;

    // ---- Quack sound effect (synthesized, no external audio file needed) ----
    let audioCtx = null;

    function playQuack() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === "suspended") {
                audioCtx.resume();
            }

            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = "sawtooth";
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1200, now);

            // Quick downward pitch sweep + amplitude envelope gives a "quack" character
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.11);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.18);
        } catch (err) {
            // Audio isn't critical to functionality; fail silently
            console.warn("Couldn't play quack sound:", err);
        }
    }

    function openChat() {
        playQuack();
        chatbotIcon.classList.add("quacking");
        setTimeout(function () {
            chatbotIcon.classList.remove("quacking");
        }, 400);
        chatbotContainer.classList.remove("hidden");
        chatbotIcon.style.display = "none";
        if (!hasGreeted) {
            hasGreeted = true;
            appendMessage("bot", "Quack! I'm Quack, your duck-brained assistant. Ask me anything about ducks 🦆");
        }
        chatbotInput.focus();
    }

    chatbotIcon.addEventListener("click", openChat);

    // Any element with data-open-chat (e.g. hero/nav CTA buttons) opens the widget too
    document.querySelectorAll("[data-open-chat]").forEach(function (el) {
        el.addEventListener("click", openChat);
    });

    closeBtn.addEventListener("click", function() {
        chatbotContainer.classList.add("hidden");
        chatbotIcon.style.display = "flex"; 
    });

    sendBtn.addEventListener("click", sendMessage);
    
    chatbotInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });   

    function sendMessage() {
        const userMessage = chatbotInput.value.trim();
        if (userMessage) {
            appendMessage("user", userMessage);
            chatbotInput.value = "";
            getBotResponse(userMessage);
        }
    }

    function appendMessage(sender, message) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        messageElement.textContent = message;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    async function getBotResponse(userMessage) {
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessage
            })
        });

        const data = await response.json();

        appendMessage("bot", data.response);

    } catch (error) {
        console.error("Error communicating with API:", error);
        appendMessage("bot", "Quack!! Something went wrong.");
    }
 }
});