# 🎨 Frontend: Architecture Overview (High-Level)

## Overview
The frontend provides a responsive, real-time interface for FridgeMate. **Note**: You focused on backend - this is a conceptual overview for interview context.

**Stack**: React + TypeScript + Tailwind CSS + Vite

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first styling |
| **Vite** | Fast build tool and dev server |
| **React Router** | Client-side routing |
| **Lucide React** | Icon library |
| **Framer Motion** | Animation library |

---

## Layer 1: Application Structure

### File Organization

```
Frontend/
├── src/
│   ├── App.tsx                 # Main routing component
│   ├── main.tsx                # Entry point
│   ├── pages/
│   │   ├── Home.tsx            # Landing page
│   │   ├── ImageUpload.tsx     # Main dashboard (IMAGE PROCESSING)
│   │   ├── About.tsx           # Project info
│   │   └── ContactPage.tsx     # Contact form
│   ├── mycomponents/
│   │   ├── navbar.tsx          # Navigation header
│   │   └── footer.tsx          # Footer
│   ├── components/ui/          # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── lib/
│       └── utils.ts            # Utility functions
└── package.json
```

### Routing (App.tsx)

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<FridgeMateHome />} />
    <Route path="/imageUpload" element={<ImageUpload />} />
    <Route path="/about" element={<FridgeMateAbout />} />
    <Route path="/contact" element={<ContactPage />} />
  </Routes>
</BrowserRouter>
```

**Navigation Flow:**
```
Home (/) 
  ↓ User clicks "Get Started"
ImageUpload (/imageUpload) ← Main interaction
  ↓ User clicks "About"
About (/about)
  ↓ User clicks "Contact"
Contact (/contact)
```

---

## Main Components (Conceptual)

**Key Pages:**
- Home: Landing page with project intro
- ImageUpload: Main feature (upload/camera capture, gallery, recipe display)
- About: Technology explanations
- Contact: User support

**Layout:**
- Navbar: Navigation, branding
- Footer: Links, copyright
- Reusable UI: Buttons, cards, dialogs, inputs

---

## Frontend-Backend Integration (Conceptual)

**Flow:**
1. User uploads/captures image
2. Local preview shown (no network)
3. User clicks "Generate"
4. POST to `/detect_and_generate` endpoint
5. Show loading state
6. Display recipe when received
7. Gallery tracks history

**Data Contract:**
```
Request: FormData(file)
Response: {recipe: {title, ingredients[], steps[]}, error}
```

---

## Summary

**Frontend Stack:** React + TypeScript + Tailwind + Vite

**Features:**
- Image upload + camera capture
- Real-time recipe generation
- Gallery history
- Responsive mobile design
- Smooth animations

**Your Role:** Backend only (understanding frontend helps with API design)

