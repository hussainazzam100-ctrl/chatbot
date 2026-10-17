from pathlib import Path
import json
import logging
import os
import random
import re
import sqlite3

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from rapidfuzz import process, fuzz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Quack.ai API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hussainazzam100-ctrl.github.io"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------
# Chat API
# ---------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(max_length=2000)


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
        logger.warning("Training phrases shared by intents: %s", collisions)

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
        "Quack! I'm a duck-focused chatbot. "
        "Try asking me about duck species, habitats, diets, or behaviour."
    )


def find_best_intent(message: str):
    normalized = normalize_text(message)
    if not normalized:
        return None

    # Exact match
    for item in phrase_index:
        if item["phrase"] == normalized:
            return item["intent"]

    # Complete phrase contained in the question
    contained_matches = []

    for item in phrase_index:
        phrase = item["phrase"]

        if len(phrase.split()) < 2 and len(phrase) < 8:
            continue

        pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"
        if re.search(pattern, normalized):
            contained_matches.append(item)

    if contained_matches:
        contained_matches.sort(
            key=lambda item: len(item["phrase"]),
            reverse=True,
        )
        return contained_matches[0]["intent"]

    # Conservative fuzzy match for typos
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
    return {"message": "Quack.ai API is running!", "version": "0.3.0"}


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


# ---------------------------------------------------------
# Quiz leaderboard API
# ---------------------------------------------------------

# For local development, the database lives beside this file.
# On Render, set QUACK_DATA_DIR to the path of a mounted
# persistent disk, such as /var/data.
DATA_DIR = Path(
    os.getenv("QUACK_DATA_DIR", str(Path(__file__).resolve().parent))
)
DATA_DIR.mkdir(parents=True, exist_ok=True)
LEADERBOARD_DB = DATA_DIR / "leaderboard.db"


def get_connection():
    connection = sqlite3.connect(LEADERBOARD_DB, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_leaderboard():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS quiz_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL CHECK(score >= 0 AND score <= 10),
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%S', 'now')
                )
            )
        """)
        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_scores_score
            ON quiz_scores(score DESC, created_at ASC)
        """)


initialize_leaderboard()


class ScoreSubmission(BaseModel):
    name: str = Field(min_length=1, max_length=24)
    score: int = Field(ge=0, le=10, strict=True)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())

        if not cleaned:
            raise ValueError("Please enter a name.")

        if len(cleaned) > 24:
            raise ValueError("Name must be 24 characters or fewer.")

        # Avoid control characters and HTML-like markup in public names.
        if any(ord(char) < 32 or ord(char) == 127 for char in cleaned):
            raise ValueError("Name contains unsupported characters.")

        if "<" in cleaned or ">" in cleaned:
            raise ValueError("Please remove angle brackets from the name.")

        return cleaned


@app.get("/leaderboard")
def get_leaderboard():
    try:
        with get_connection() as connection:
            rows = connection.execute("""
                SELECT
                    name,
                    score,
                    created_at,
                    RANK() OVER (ORDER BY score DESC) AS rank
                FROM quiz_scores
                ORDER BY score DESC, created_at ASC, id ASC
                LIMIT 100
            """).fetchall()

        return {
            "entries": [
                {
                    "rank": row["rank"],
                    "name": row["name"],
                    "score": row["score"],
                    "created_at": row["created_at"],
                }
                for row in rows
            ]
        }
    except sqlite3.Error:
        logger.exception("Failed to read quiz leaderboard")
        raise HTTPException(
            status_code=500,
            detail="The leaderboard is temporarily unavailable.",
        )


@app.post("/leaderboard", status_code=201)
def submit_score(submission: ScoreSubmission, request: Request):
    # Basic server-side validation prevents invalid scores, but this
    # is not strong anti-cheat: clients can still submit fabricated scores.
    try:
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO quiz_scores (name, score) VALUES (?, ?)",
                (submission.name, submission.score),
            )

        logger.info(
            "Quiz score accepted: score=%s",
            submission.score,
        )
        return {
            "message": "Score saved.",
            "name": submission.name,
            "score": submission.score,
        }
    except sqlite3.Error:
        logger.exception("Failed to save quiz score")
        raise HTTPException(
            status_code=500,
            detail="The score could not be saved.",
        )
