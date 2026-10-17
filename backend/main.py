from pathlib import Path
import json
import random
import re
import logging


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from rapidfuzz import process, fuzz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Quack.ai API", version="0.2.0")

# Your frontend can call this API.
# For production, restrict this to your actual frontend origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hussainazzam100-ctrl.github.io"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(max_length=2000)


# Load the database relative to this Python file.
DB_PATH = Path(__file__).resolve().parent / "chatbot_db.json"


def normalize_text(text: str) -> str:
    """Normalize case, punctuation and whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_database():
    with DB_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data.get("intents"), list):
        raise ValueError("Database must contain an 'intents' list.")

    names = set()
    phrase_index = []
    duplicate_phrases = {}

    for intent in data["intents"]:
        name = intent.get("intent_name")
        phrases = intent.get("training_phrases", [])
        responses = intent.get("responses", [])

        if not name or not isinstance(phrases, list):
            raise ValueError("An intent has an invalid name or phrase list.")

        if name in names:
            raise ValueError(f"Duplicate intent name: {name}")
        names.add(name)

        if not isinstance(responses, list) or not all(
            isinstance(response, str) and response.strip()
            for response in responses
        ):
            raise ValueError(f"Invalid responses for intent: {name}")

        for phrase in phrases:
            if not isinstance(phrase, str) or not phrase.strip():
                continue

            normalized = normalize_text(phrase)
            if not normalized:
                continue

            phrase_index.append({
                "phrase": normalized,
                "intent": name,
            })

            duplicate_phrases.setdefault(normalized, set()).add(name)

    collisions = {
        phrase: sorted(intent_names)
        for phrase, intent_names in duplicate_phrases.items()
        if len(intent_names) > 1
    }

    if collisions:
        logger.warning(
            "Training phrases shared by multiple intents: %s",
            collisions
        )

    if "unknown" not in names:
        logger.warning("No 'unknown' intent exists in the database.")

    return data, phrase_index


chatbot_data, phrase_index = load_database()
phrases_for_fuzzy_matching = [item["phrase"] for item in phrase_index]

intents_by_name = {
    intent["intent_name"]: intent
    for intent in chatbot_data["intents"]
}


def get_fallback_response():
    unknown = intents_by_name.get("unknown", {})
    responses = unknown.get("responses", [])

    if responses:
        return random.choice(responses)

    return (
        "Quack! I don't know that one yet. "
        "Try asking me something about ducks!"
    )


def find_best_intent(message: str):
    """
    Matching order:
    1. Exact question match.
    2. Complete phrase contained in the message.
    3. Fuzzy spelling match above a conservative threshold.
    """

    normalized = normalize_text(message)

    if not normalized:
        return None

    # 1. Exact matches take priority.
    exact_matches = [
        item for item in phrase_index
        if item["phrase"] == normalized
    ]

    if exact_matches:
        return exact_matches[0]["intent"]

    # 2. Match complete phrases, not arbitrary substrings.
    contained_matches = []

    for item in phrase_index:
        phrase = item["phrase"]

        # Avoid short matches such as "hi" inside "his".
        if len(phrase.split()) < 2 and len(phrase) < 8:
            continue

        pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"

        if re.search(pattern, normalized):
            contained_matches.append(item)

    if contained_matches:
        # Prefer the most specific matching phrase.
        contained_matches.sort(
            key=lambda item: len(item["phrase"]),
            reverse=True
        )
        return contained_matches[0]["intent"]

    # 3. Fuzzy matching helps with typos, not arbitrary meanings.
    if len(normalized) >= 5 and phrases_for_fuzzy_matching:
        result = process.extractOne(
            normalized,
            phrases_for_fuzzy_matching,
            scorer=fuzz.ratio,
            score_cutoff=88,
        )

        if result:
            matched_phrase, score, index = result
            logger.info(
                "Fuzzy match: %r -> %r (score %.1f)",
                normalized,
                matched_phrase,
                score,
            )
            return phrase_index[index]["intent"]

    return None


def build_response(message: str):
    if not message:
        return {
            "response": "Type a message first, and I'll do my best to help!",
            "intent": None,
        }

    intent_name = find_best_intent(message)

    if intent_name is None:
        return {
            "response": get_fallback_response(),
            "intent": None,
        }

    intent = intents_by_name.get(intent_name)

    if not intent or not intent.get("responses"):
        logger.error("Matched intent has no usable responses: %s", intent_name)
        return {
            "response": get_fallback_response(),
            "intent": None,
        }

    return {
        "response": random.choice(intent["responses"]),
        "intent": intent_name,
    }


@app.get("/")
def root():
    return {
        "message": "Quack.ai API is running!",
        "version": "0.2.0",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "intents_loaded": len(chatbot_data["intents"]),
        "training_phrases_loaded": len(phrase_index),
    }


@app.post("/chat")
def chat(request: ChatRequest):
    return build_response(request.message.strip())
