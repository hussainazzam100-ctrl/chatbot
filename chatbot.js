document.addEventListener("DOMContentLoaded", function () {
    const chatbotContainer = document.getElementById("chatbot-container");
    const closeBtn = document.getElementById("close-btn");
    const sendBtn = document.getElementById("send-btn");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotMessages = document.getElementById("chatbot-messages");
    const chatbotIcon = document.getElementById("chatbot-icon");

    chatbotIcon.addEventListener("click", function () {
        chatbotContainer.classList.remove("hidden");
        chatbotIcon.style.display = "none"; 
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
            const response = await fetch("chatbot_db.json");
            const data = await response.json();

            const cleanInput = userMessage.toLowerCase().trim();
            let botReply = null;

            for (const intent of data.intents) {
                const matched = intent.training_phrases.some(phrase => {
                    const cleanPhrase = phrase.toLowerCase().trim();
                    return cleanInput === cleanPhrase || cleanInput.includes(cleanPhrase);
                });

                if (matched) {
                    const randomIndex = Math.floor(Math.random() * intent.responses.length);
                    botReply = intent.responses[randomIndex];
                    break;
                }
            }

            if (!botReply) {
                botReply = "Quack! I'm not sure how to answer that yet.";
            }

            appendMessage("bot", botReply);
        } catch (error) {
            console.error("Error Loading JSON:", error);
            appendMessage("bot", "Quack!!, Something went wrong.");
        }
    }
});