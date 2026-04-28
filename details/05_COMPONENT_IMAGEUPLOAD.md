# 📸 Frontend: ImageUpload Component (Conceptual)

## Overview
`ImageUpload.tsx` is the main feature component. **Conceptual overview only - understand user flow, not implementation details.**

**Responsibilities:**
- Image upload + camera capture
- Local preview (no network)
- Gallery state management
- Backend API communication
- Recipe display + animations
- Error handling

---

## User Flow

```
1. User opens page
   ↓
2. Choose input: Upload file OR Capture from camera
   ↓
3. See local preview (instant, no network)
   ↓
4. Click "Generate Recipe" button
   ↓
5. Show loading spinner (status: "processing")
   ↓
6. Backend processes image:
   - OpenCV preprocessing
   - YOLOv8 detection
   - Prompt engineering
   - Gemini LLM call
   (your domain!)
   ↓
7. Show recipe result (title, ingredients, steps)
   ↓
8. Item saved in gallery for later reference
   ↓
9. User can delete, retry, or process another image
```

---

## Component Structure (High-Level)

### Key Data Types

```
Recipe: {
  title: string
  ingredients: string[]
  steps: string[]
}

GalleryItem: {
  id: unique identifier
  file: binary image data
  url: preview image URL
  status: "processing" | "done" | "error"
  recipe: Recipe or null
  error: error message or null
}
```

### Main Sections

**Left Panel: Gallery**
- Shows thumbnails of all processed images
- Click to select and view recipe
- Status indicator: processing spinner, error icon, checkmark

**Middle Panel: Upload/Camera**
- File upload: Browse computer for image
- Camera capture: Use device camera
- Drag & drop: Easy file addition
- Preview: See image before sending to backend

**Right Panel: Recipe Display**
- Show title, ingredients, steps
- Loading state while processing
- Error message if generation fails
- Copy/share buttons

---

## Key Features

✅ **Multiple Input Methods**
- File upload from computer
- Camera capture from device
- Drag & drop support

✅ **Local Preview**
- Instant preview (no network delay)
- See what you're sending before processing

✅ **Real-time Processing**
- Show loading spinner
- Update UI as recipe generates
- Smooth animations

✅ **Gallery Management**
- Keep history of all processed images
- Click to view past recipes
- Delete old items

✅ **Error Handling**
- Show clear error messages
- Retry button on failure
- Graceful degradation (no crashes)

✅ **Mobile-Friendly**
- Responsive layout (adapts to screen size)
- Touch-friendly buttons
- Camera access on mobile devices

---

## Backend Integration (API Contract)

**Your Backend Endpoint:**
```
POST /detect_and_generate
```

**Request:**
```
FormData(file: binary image data)
```

**Response:**
```json
{
  "recipe": {
    "title": "Tomato Pasta",
    "ingredients": ["tomatoes", "onion", "garlic"],
    "steps": ["Sauté onions", "Add tomatoes", "Simmer 10 min"]
  },
  "error": null
}
```

**Error Response:**
```json
{
  "recipe": null,
  "error": "Network error" | "No ingredients detected" | "API timeout"
}
```

---

## State Management (Conceptual)

**Gallery Array:**
- Stores all processed images + recipes
- Each item has unique ID for identification
- Status tracks if processing, done, or error

**Selected Item:**
- Which gallery item to display in right panel
- Used to show recipe/error when clicked

**Preview File:**
- File being previewed before adding to gallery
- Shows local preview instantly (no backend)

**Processing Flag:**
- Tracks if any request is in-flight
- Prevents duplicate submissions

---

## Error Scenarios Handled

| Scenario | Handling |
|----------|----------|
| No ingredients detected | Show message "No items found, try different image" |
| Network error | Show "Connection failed, retry?" with button |
| API timeout | Show "Backend busy, try again" |
| File too large | Show "Image too large, max 10MB" |
| Camera permission denied | Show "Allow camera access in settings" |
| Invalid image file | Show "Not a valid image file" |

---

## Summary

**ImageUpload Component Responsibilities:**
1. **Input**: Receive user image (upload or camera)
2. **Preview**: Show local preview (instant feedback)
3. **Processing**: Send to backend, show loading state
4. **Output**: Display generated recipe
5. **Management**: Gallery history, delete, retry

**Your Focus:**
- Backend AI pipeline (detect ingredients, generate recipes)
- Frontend just displays your results

**Frontend-Backend Relationship:**
```
Frontend: "User uploaded image, here it is"
   ↓ (FormData POST)
Backend: "Let me process this..." [your code]
   ↓ (JSON response)
Frontend: "Got recipe! Displaying to user"
```

---

**For interview:** Understand that ImageUpload is just the wrapper around your AI pipeline. Your work (AI layers) is what makes the recipes appear!