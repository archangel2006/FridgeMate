from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import traceback
import json
import requests
from dotenv import load_dotenv
from detect import detect_ingredients

load_dotenv(".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ---- Free Gemini model fallback chain ----
# If one model's quota is exhausted (429), the next one is tried automatically.
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]

app = FastAPI(title="FridgeMate AI Recipe Assistant")

# ---- CORS: allow all origins (required for Vercel → Render cross-origin calls) ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_gemini_recipe(prompt: str) -> dict:
    """
    Try each free Gemini model in order.
    Falls back to the next model if quota is exceeded (HTTP 429) or the model errors.
    Raises an Exception only if all models fail.
    """
    base_url = "https://generativelanguage.googleapis.com/v1beta/models"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }

    last_error = None
    for model_name in GEMINI_MODELS:
        url = f"{base_url}/{model_name}:generateContent"
        try:
            response = requests.post(
                url,
                params={"key": GEMINI_API_KEY},
                json=payload,
                timeout=60,
            )
            if response.status_code == 429:
                print(f"⚠️  Quota exceeded for {model_name}, trying next model...")
                last_error = f"Quota exceeded for {model_name}"
                continue
            response.raise_for_status()
            print(f"✅ Used model: {model_name}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"⚠️  HTTP error with {model_name}: {e}")
            last_error = str(e)
            continue
        except Exception as e:
            print(f"⚠️  Unexpected error with {model_name}: {e}")
            last_error = str(e)
            continue

    raise Exception(f"All Gemini models failed. Last error: {last_error}")


def sanitize_response(text: str) -> str:
    """Strip markdown code fences from Gemini response."""
    text = text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return text


def build_prompt(ingredients_list: str) -> str:
    if not ingredients_list.strip():
        return """
        Return a result in this exact JSON format:
        {
          "title": "Unknown",
          "ingredients": [],
          "steps": []
        }
        """
    return f"""
    You are a professional recipe generator AI.

    Using ONLY these ingredients: {ingredients_list}, generate a creative cooking recipe that involves
    actual cooking steps (e.g., roasting, baking, stir-frying, steaming). Avoid salads, fruit mixes,
    or any recipe that simply cuts and puts ingredients in a bowl to eat raw.

    Output JSON ONLY. No explanation, no markdown, no text besides JSON.

    JSON structure must be exactly:
    {{
      "title": "string",
      "ingredients": ["list of strings"],
      "steps": ["list of strings"]
    }}
    """


@app.get("/")
async def root():
    return {"status": "FridgeMate backend is running 🚀"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/detect_and_generate")
async def detect_and_generate(file: UploadFile = File(...)):
    temp_path = f"/tmp/temp_{file.filename}"

    # Save uploaded file temporarily
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Step 1: Detect ingredients with YOLO
        detected = detect_ingredients(temp_path)
        ingredients_list = ", ".join(
            [f"{i['count']} {i['name']}" for i in detected["ingredients"]]
        )

        # Step 2: Build prompt
        prompt = build_prompt(ingredients_list)

        # Step 3: Generate recipe via Gemini (with fallback)
        gemini_response = get_gemini_recipe(prompt)

        content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        print("Gemini raw output:", repr(content))

        content = sanitize_response(content)

        try:
            recipe_json = json.loads(content)
        except Exception:
            recipe_json = {
                "title": "Parsing Error",
                "ingredients": [],
                "steps": [content],
            }

        return {
            "ingredients": detected["ingredients"],
            "recipe": recipe_json,
        }

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
