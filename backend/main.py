from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


with open("chatbot_db.json", "r", encoding="utf-8") as file:
    chatbot_data = json.load(file)


@app.get("/")
def root():
    return {"message": "Quack.ai API is running!"}


@app.post("/chat")
def chat(request: ChatRequest):
    user_message = request.message.lower().strip()

    for intent in chatbot_data["intents"]:
        for phrase in intent["training_phrases"]:
            clean_phrase = phrase.lower().strip()

            if clean_phrase in user_message:
                response = random.choice(intent["responses"])

                return {
                    "response": response,
                    "intent": intent["intent_name"]
                }

    return {
        "response": "Quack! I'm not sure how to answer that yet.",
        "intent": None
    }