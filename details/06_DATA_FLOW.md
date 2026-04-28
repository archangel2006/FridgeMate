# 🔄 Data Flow & API Contract

## Overview
This document specifies the exact data structures flowing between frontend and backend, ensuring clear understanding of the system's integration points.

---

## Request-Response Cycle

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│  1. User selects/captures image                                 │
│  2. Creates FormData object                                     │
│  3. Sends HTTP POST request                                     │
│                                                                  │
│  POST http://localhost:8000/detect_and_generate                │
│  Content-Type: multipart/form-data                             │
│  Body:                                                          │
│    - file: [binary image data]                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                        ↓ [HTTP Request]
                  [Network Transit]
                        ↓
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
│                                                                  │
│  1. Receive UploadFile                                          │
│  2. Save to temporary path                                      │
│  3. Call detect.py: detect_ingredients(temp_path)             │
│  4. Format ingredients: "2 tomato, 1 onion, ..."              │
│  5. Build prompt with ingredients                              │
│  6. Call Gemini API with prompt                                │
│  7. Parse/sanitize response                                    │
│  8. Return JSON response                                       │
│                                                                  │
│  Response:                                                      │
│    200 OK                                                       │
│    Content-Type: application/json                              │
│    Body: {...recipe JSON...}                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                        ↓ [HTTP Response]
                  [Network Transit]
                        ↓
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│  1. Parse response JSON                                         │
│  2. Update gallery item state                                  │
│  3. Change status from "processing" to "done"                  │
│  4. Display recipe to user                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Frontend Request

### FormData Format (Multipart)

```typescript
// Creating the request
const form = new FormData();
form.append("file", file);  // file: File object from input

const response = await fetch("http://localhost:8000/detect_and_generate", {
  method: "POST",
  body: form  // FormData automatically sets Content-Type: multipart/form-data
});
```

### HTTP Headers (Auto-Generated)

```
POST /detect_and_generate HTTP/1.1
Host: localhost:8000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Content-Length: 2048576

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="fridge.jpg"
Content-Type: image/jpeg

[binary image data here]
------WebKitFormBoundary...--
```

### Frontend Code Example

```typescript
async function sendImageToBackend(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const response = await fetch("http://localhost:8000/detect_and_generate", {
      method: "POST",
      body: formData
      // Note: DON'T set Content-Type header
      // FormData sets it automatically with boundary
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error("Error:", error);
    return { recipe: null, error: error.message };
  }
}
```

---

## Backend Processing

### Step-by-Step Data Transformation

#### **Step 1: Receive UploadFile**

```python
@app.post("/detect_and_generate")
async def detect_and_generate(file: UploadFile = File(...)):
    # file: FastAPI UploadFile object
    # Attributes:
    #   file.filename: "fridge.jpg"
    #   file.file: BytesIO object
    #   file.content_type: "image/jpeg"
    #   file.size: 2048576 (bytes)
    
    print(f"Received: {file.filename}, Size: {file.size} bytes")
```

#### **Step 2: Save to Disk**

```python
    temp_path = f"temp_{file.filename}"  # "temp_fridge.jpg"
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Now YOLOv8 can read from disk
```

#### **Step 3: Run Detection**

```python
    from detect import detect_ingredients
    
    detected = detect_ingredients(temp_path)
    
    # Returns:
    # {
    #   "ingredients": [
    #     {"name": "tomato", "count": 2},
    #     {"name": "onion", "count": 1},
    #     {"name": "garlic", "count": 3}
    #   ]
    # }
```

#### **Step 4: Format as String**

```python
    ingredients_list = ", ".join([
        f"{i['count']} {i['name']}" 
        for i in detected["ingredients"]
    ])
    
    # Result: "2 tomato, 1 onion, 3 garlic"
```

#### **Step 5: Build Prompt**

```python
    if ingredients_list.strip() == "":
        prompt = """
        Return a result in this exact JSON format:
        {"title": "Unknown", "ingredients": [], "steps": []}
        """
    else:
        prompt = f"""
        You are a professional recipe generator AI.
        
        Using ONLY these ingredients: {ingredients_list}, generate a creative 
        cooking recipe that involves actual cooking steps...
        
        Output JSON ONLY. No explanation, no markdown, no text besides JSON.
        
        JSON structure must be exactly:
        {{
          "title": "string",
          "ingredients": ["list of strings"],
          "steps": ["list of strings"]
        }}
        """
```

#### **Step 6: Call Gemini API**

```python
    from requests import post
    
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    response = post(
        url, 
        params={"key": GEMINI_API_KEY}, 
        json=payload
    )
    
    gemini_response = response.json()
    
    # Response structure:
    # {
    #   "candidates": [{
    #     "content": {"parts": [{"text": "{...recipe JSON...}"}]},
    #     "finishReason": "STOP"
    #   }],
    #   "usageMetadata": {...}
    # }
```

#### **Step 7: Extract & Parse**

```python
    import json
    
    # Extract text from nested structure
    content = gemini_response["candidates"][0]["content"]["parts"][0]["text"]
    
    # Sanitize markdown
    sanitized = content.strip()
    sanitized = sanitized.replace("```json", "").replace("```", "").strip()
    
    # Parse JSON
    recipe_data = json.loads(sanitized)
    
    # Result:
    # {
    #   "title": "Savory Tomato & Onion Bake",
    #   "ingredients": ["2 tomatoes", "1 onion", "3 garlic"],
    #   "steps": [
    #     "Sauté onions and garlic",
    #     "Add tomatoes and cook",
    #     "Bake at 375°F"
    #   ]
    # }
```

---

## Backend Response

### Success Response (HTTP 200)

```json
{
  "recipe": {
    "title": "Savory Tomato & Onion Bake",
    "ingredients": [
      "2 ripe tomatoes, diced",
      "3 yellow onions, sliced",
      "3 garlic cloves, minced",
      "2 tablespoons olive oil",
      "salt and pepper to taste"
    ],
    "steps": [
      "Preheat oven to 375°F",
      "Heat olive oil in a large skillet over medium heat",
      "Sauté onions and garlic until golden brown, about 5 minutes",
      "Add diced tomatoes and cook for 10 minutes until softened",
      "Transfer to a baking dish and top with cheese if desired",
      "Bake for 25-30 minutes until golden and bubbly",
      "Let cool for 5 minutes before serving"
    ]
  },
  "error": null
}
```

**HTTP Details:**
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 1523
Date: Mon, 28 Apr 2026 10:30:00 GMT

{...response body...}
```

### Error Response (HTTP 200 with error field)

```json
{
  "recipe": null,
  "error": "Failed to parse recipe response: JSONDecodeError"
}
```

### Empty Ingredients Response (HTTP 200)

```json
{
  "recipe": {
    "title": "Unknown",
    "ingredients": [],
    "steps": []
  },
  "error": null
}
```

---

## Detection Results Format

### From detect.py

```python
detect_ingredients(image_path)

# Returns:
{
  "ingredients": [
    {"name": "apple", "count": 2},
    {"name": "banana", "count": 3},
    {"name": "orange", "count": 1}
  ]
}

# Or (if no detections):
{
  "ingredients": []
}

# Or (if error):
{
  "ingredients": [],
  "error": "YOLO model not found"
}
```

### Mapping to String

```python
# From: [{"name": "apple", "count": 2}, {"name": "banana", "count": 3}]
# To: "2 apple, 3 banana"

ingredients_string = ", ".join([
    f"{item['count']} {item['name']}" 
    for item in detected_items
])
```

---

## Gemini API Integration

### API Request Payload

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Using ONLY these ingredients: 2 tomato, 1 onion, 3 garlic, generate a creative cooking recipe that involves actual cooking steps..."
        }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
}
```

### API Response Structure

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "{\"title\": \"...\", \"ingredients\": [...], \"steps\": [...]}"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "safetyRatings": [
        {"category": "HARM_CATEGORY_HARASSMENT", "probability": "NEGLIGIBLE"}
      ]
    }
  ],
  "usageMetadata": {
    "promptTokens": 234,
    "candidatesTokens": 156,
    "totalTokens": 390
  }
}
```

---

## Frontend Response Handling

### Parse Response

```typescript
const response = await fetch("http://localhost:8000/detect_and_generate", {
  method: "POST",
  body: formData
});

const data = await response.json();
// data = {
//   "recipe": {
//     "title": "...",
//     "ingredients": [...],
//     "steps": [...]
//   },
//   "error": null
// }

// Check response
if (data.recipe) {
  // Success: Use recipe
  updateGalleryItem({
    status: "done",
    recipe: data.recipe,
    error: null
  });
} else {
  // Error: Show message
  updateGalleryItem({
    status: "error",
    recipe: null,
    error: data.error
  });
}
```

### TypeScript Types

```typescript
interface Recipe {
  title: string;
  ingredients: string[];
  steps: string[];
}

interface APIResponse {
  recipe: Recipe | null;
  error: string | null;
}
```

---

## Error Scenarios

### Scenario 1: Empty Image (No Ingredients Detected)

```
Frontend → Image with empty fridge
          ↓
Backend → YOLOv8 returns no boxes
        → ingredients_list = ""
        → Send prompt for empty case
        ↓
Gemini → Return empty recipe
        ↓
Frontend ← {recipe: {title: "Unknown", ingredients: [], steps: []}, error: null}
         → Display "No ingredients detected"
```

### Scenario 2: Invalid API Key

```
Frontend → Image upload
          ↓
Backend → Call Gemini API
        → 403 Forbidden (invalid key)
        ↓
Backend → Catch exception
        → return {recipe: null, error: "API error: 403"}
        ↓
Frontend ← Error response
         → Display "Recipe generation failed"
         → Show retry button
```

### Scenario 3: Malformed LLM Response

```
Frontend → Image upload
          ↓
Backend → Call Gemini API
        → Returns text: "Some explanation {\"title\": ...} more text"
        ↓
Backend → Sanitize fails
        → json.loads() raises JSONDecodeError
        ↓
Backend → Catch exception
        → return {recipe: null, error: "Failed to parse response"}
        ↓
Frontend ← Error response
         → Display "Failed to generate recipe"
```

### Scenario 4: Network Timeout

```
Frontend → Image upload
          ↓
Backend → (Processing takes >30 seconds)
        → Browser times out
        ↓
Frontend ← Error: "Network timeout"
         → Display "Request took too long"
         → Show retry button
```

---

## Timing Expectations

### Request Timeline

```
Frontend Action:
  T=0ms     User clicks "Generate"
  T=0-50ms  Create FormData
  T=50ms    Send HTTP POST

Backend Processing:
  T=50-100ms     Receive & save file
  T=100-300ms    YOLOv8 inference
  T=300-400ms    Format & build prompt
  T=400-1200ms   Call Gemini API (network + LLM)
  T=1200-1250ms  Parse response

Frontend Receives:
  T=1250-1300ms  Response parsed
  T=1300-1350ms  State updated
  T=1350ms       UI re-renders
  T=1350-1400ms  Animations complete

Total Time: ~1.3-1.4 seconds
```

---

## CORS & Cross-Origin Requests

### Frontend Origin
```
http://localhost:5173
```

### Backend Origin
```
http://localhost:8000
```

### CORS Headers (Backend Response)

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Credentials: true
```

### Why CORS Needed?
- Different origins (5173 vs 8000)
- Browser security prevents cross-origin requests
- Backend CORS middleware allows frontend to communicate

---

## Summary

**Complete Data Flow:**

```
Frontend                              Backend
────────────────────────────────────────────────
User Input
  ↓
FormData(file)
  ↓
POST /detect_and_generate ──────→ Receive UploadFile
                                    ↓
                              Save to temp file
                                    ↓
                              Run YOLOv8 detection
                                    ↓
                              Format ingredients
                                    ↓
                              Call Gemini API
                                    ↓
                              Parse response
                                    ↓
                              Return JSON ←────── Parse Response
                                        ↓
                                    Update Gallery
                                        ↓
                                    Display Recipe
```

**Key Data Structures:**
- Upload: FormData with File
- Detection Result: {ingredients: [{name, count}]}
- Recipe: {title, ingredients[], steps[]}
- API Response: {recipe, error}

**Performance:**
- Total request time: ~1.3 seconds
- Network: ~200-400ms
- YOLOv8: ~200-300ms
- Gemini: ~500-1000ms
- Parsing: ~10-50ms

