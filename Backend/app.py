import os
os.environ["TORCH_FORCE_WEIGHTS_ONLY_LOAD"] = "0"

import torch
# Monkeypatch torch.load to default weights_only to False for PyTorch 2.6+ compatibility
original_load = torch.load
def patched_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return original_load(*args, **kwargs)
torch.load = patched_load

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import shutil
import traceback
import json
import requests
from dotenv import load_dotenv
from detect import detect_ingredients


load_dotenv(".env")

print("🔑 Loaded Key:", os.getenv("GEMINI_API_KEY"))


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


app = FastAPI(title="AI Recipe Assistant")

# ---- Enable CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Gemini Request Function ----
def get_gemini_recipe(prompt):
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }
    
    response = requests.post(url, params={"key": GEMINI_API_KEY}, json=payload)
    response.raise_for_status()
    return response.json()


def sanitize_response(text):
    """Clean extra formatting like ```json ... ```"""
    text = text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    return text


@app.post("/detect_and_generate")
async def detect_and_generate(file: UploadFile = File(...)):

    temp_path = f"temp_{file.filename}"

    # Save file temporarily
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detected = detect_ingredients(temp_path)
    ingredients_list = ", ".join([f"{i['count']} {i['name']}" for i in detected["ingredients"]])

    # Custom prompt logic
    if ingredients_list.strip() == "":
        prompt = """
        Return a result in this exact JSON format:

        {
          "title": "Unknown",
          "ingredients": [],
          "steps": []
        }
        """
    else:
        prompt = f"""
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

    try:
        gemini_response = get_gemini_recipe(prompt)

        # Extract generated text
        content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
        print("\nGemini raw output:", repr(content))

        content = sanitize_response(content)

        try:
            recipe_json = json.loads(content)
        except Exception:
            recipe_json = {
                "title": "Response Parsing Error",
                "ingredients": [],
                "steps": [content]
            }

        return {
            "ingredients": detected["ingredients"],
            "recipe": recipe_json
        }

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

    finally:
        try:
            os.remove(temp_path)
        except:
            pass
