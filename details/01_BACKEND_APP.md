# 🔧 Backend: FastAPI Application (app.py)

## Overview
`app.py` is the core orchestrator that:
- Receives image uploads via REST API
- Coordinates YOLOv8 detection
- Manages Gemini API calls
- Returns structured recipe data

---

## Layer 1: Imports & Configuration

```python
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
```

**Key Points:**
- `FastAPI`: Web framework for REST APIs
- `File, UploadFile`: FastAPI utilities for file handling
- `CORSMiddleware`: Allows frontend (different port) to call backend
- `requests`: HTTP client for calling external APIs (Gemini)
- `dotenv`: Loads environment variables from .env file

```python
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
app = FastAPI(title="AI Recipe Assistant")
```

**Flow**: Load API key from environment → Initialize FastAPI app

---

## Layer 2: CORS Middleware Setup

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],                    # Allow all origins
    allow_credentials=True,                 # Allow cookies
    allow_methods=["*"],                    # Allow GET, POST, etc.
    allow_headers=["*"],                    # Allow all headers
)
```

**Why CORS?**
- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:8000`
- Different origins → browser blocks requests without CORS headers
- CORS middleware tells browser the request is allowed

**Security Note**: `allow_origins=["*"]` is for development only. In production, specify exact frontend URL.

---

## Layer 3: Gemini API Abstraction Function

```python
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
```

**Breaking Down the Request:**

| Part | Explanation |
|------|-------------|
| URL | Google's Gemini API endpoint |
| Model | `gemini-2.5-flash`: Faster, cheaper variant |
| contents | Text input wrapped in required format |
| response_mime_type | Forces JSON output (not plain text) |
| params["key"] | Authentication with Gemini API key |

**Key Integration Points:**
- Separates API logic from business logic
- Handles HTTP request/response
- `response.raise_for_status()` throws error if status is 4xx/5xx

---

## Layer 4: Response Sanitization

```python
def sanitize_response(text):
    """Clean extra formatting like ```json ... ```"""
    text = text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return text
```

**Problem it solves:**
- LLMs sometimes wrap JSON in markdown code blocks: ` ```json {...} ``` `
- This breaks JSON parsing

**Solution:**
- Remove markdown fences
- Return clean JSON string

**Example:**
```
Input:  "```json\n{\"title\": \"Pizza\"}\n```"
Output: "{\"title\": \"Pizza\"}"
```

---

## Layer 5: Main Endpoint - Detect & Generate

```python
@app.post("/detect_and_generate")
async def detect_and_generate(file: UploadFile = File(...)):
```

**Endpoint Details:**
- **Method**: POST (because we're uploading a file)
- **Route**: `/detect_and_generate`
- **Input**: Single file upload (required with `File(...)`)
- **Async**: Can handle multiple requests concurrently

### Step A: File Reception & Storage

```python
    temp_path = f"temp_{file.filename}"
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
```

**Flow:**
1. Create temporary filename
2. Open file in write-binary mode (`"wb"`)
3. Copy uploaded file contents to disk
4. `temp_path` now contains the image

**Why temporary?** YOLOv8 requires file path, not bytes object

### Step B: YOLOv8 Ingredient Detection

```python
    detected = detect_ingredients(temp_path)
    ingredients_list = ", ".join([f"{i['count']} {i['name']}" for i in detected["ingredients"]])
```

**Flow:**
1. Call `detect_ingredients()` from detect.py
2. Returns: `{"ingredients": [{"name": "tomato", "count": 2}, {...}]}`
3. Format as string: `"2 tomato, 1 potato, ..."`

**Example:**
```
detected = {"ingredients": [{"name": "tomato", "count": 2}, {"name": "onion", "count": 1}]}
ingredients_list = "2 tomato, 1 onion"
```

### Step C: Conditional Prompt Engineering

```python
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

        Using ONLY these ingredients: {ingredients_list}, generate a creative cooking recipe...
        
        Output JSON ONLY. No explanation, no markdown, no text besides JSON.

        JSON structure must be exactly:

        {{
          "title": "string",
          "ingredients": ["list of strings"],
          "steps": ["list of strings"]
        }}
        """
```

**Two Scenarios:**

| Scenario | Action |
|----------|--------|
| **No ingredients detected** | Return empty recipe (graceful fallback) |
| **Ingredients found** | Send ingredients to Gemini for creative recipe |

**Key Prompt Engineering Techniques:**
- "Using ONLY these ingredients" → Forces relevance
- "creative cooking recipe" → Encourages variety
- "No salads, fruit mixes" → Specifies cooking requirement
- "Output JSON ONLY" → Prevents unwanted text
- Exact structure specified → Ensures parseable output

### Step D: Gemini API Call & Response Parsing

```python
    try:
        gemini_response = get_gemini_recipe(prompt)
        
        # Extract generated text
        content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
```

**Response Structure from Gemini:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\"title\": \"Tomato Pasta\", ...}"
          }
        ]
      }
    }
  ]
}
```

**Extraction Path:**
1. `gemini_response["candidates"][0]` → First completion
2. `["content"]["parts"][0]["text"]` → Actual text content
3. Result: Clean JSON string

**Error Handling:**
```python
        sanitized = sanitize_response(content)
        recipe_data = json.loads(sanitized)
```

- Sanitize markdown formatting
- Parse JSON into Python dict

### Step E: Response Return

```python
        return {
            "recipe": recipe_data,
            "error": None
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "recipe": None,
            "error": str(e)
        }
```

**Happy Path:**
- Return recipe data + no error

**Error Handling:**
- Catch any exception (API failure, malformed JSON, etc.)
- Log traceback (useful for debugging)
- Return error message to frontend
- Frontend can display "Recipe generation failed"

---

## Key Architectural Points

### 1. **Async/Await Pattern**
```python
async def detect_and_generate(file: UploadFile = File(...)):
```
- Allows FastAPI to handle multiple requests simultaneously
- Non-blocking I/O operations

### 2. **Dependency Injection**
```python
from detect import detect_ingredients
```
- Separate detection logic into its own module
- Clean imports and testability

### 3. **Error Handling Strategy**
```python
try:
    # Main logic
except Exception as e:
    # Graceful fallback
    return {"recipe": None, "error": str(e)}
```
- Never crashes the server
- Returns structured error response
- Helps frontend show user-friendly messages

### 4. **Prompt Engineering**
- Different prompts for different scenarios (empty vs. with ingredients)
- Specific instructions to guide LLM output
- JSON structure specification ensures parseable responses

---

## Testing the Endpoint

### Using curl:
```bash
curl -X POST "http://localhost:8000/detect_and_generate" \
  -F "file=@/path/to/image.jpg"
```

### Using Python requests:
```python
import requests

with open("fridge_image.jpg", "rb") as f:
    files = {"file": f}
    response = requests.post("http://localhost:8000/detect_and_generate", files=files)
    print(response.json())
```

### Using API docs:
- Visit: `http://localhost:8000/docs`
- Click on POST `/detect_and_generate`
- Click "Try it out"
- Upload image
- Click "Execute"

---

## Common Issues & Debugging

| Issue | Cause | Fix |
|-------|-------|-----|
| `KeyError: 'candidates'` | Gemini API error or invalid key | Check GEMINI_API_KEY in .env |
| `json.JSONDecodeError` | LLM returned non-JSON | Improve prompt or sanitization |
| `FileNotFoundError` | Image path issues | Ensure temp file is created properly |
| CORS error in frontend | CORS middleware not set up | Verify middleware in app.py |
| 403 Forbidden from Gemini | Invalid API key | Regenerate key from aistudio.google.com |

---

## Summary

**app.py handles:**
1. ✅ HTTP server setup with FastAPI
2. ✅ CORS configuration for cross-origin requests
3. ✅ File upload reception and storage
4. ✅ Orchestration of YOLOv8 detection (calls detect.py)
5. ✅ Gemini API integration with prompt engineering
6. ✅ Response parsing and sanitization
7. ✅ Error handling and graceful fallbacks
8. ✅ Structured JSON responses to frontend

**Technologies Used:**
- FastAPI: Web framework
- Requests: HTTP client
- Python-dotenv: Environment management
- Ultralytics (via detect.py): YOLOv8 orchestration

