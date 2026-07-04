// FridgeMateDashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import FridgeMateFooter from "../mycomponents/footer";
import { FridgeMateHeader } from "../mycomponents/navbar";
import {
  Upload,
  Camera,
  ChefHat,
  Lightbulb,
  Menu,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
};

type GalleryItem = {
  id: string;
  file: File;
  url: string;
  status: "processing" | "done" | "error";
  createdAt: number;
  recipe?: Recipe | null;
  error?: string | null;
};

export default function FridgeMateDashboard(): React.JSX.Element {
  // gallery of processed items
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  // currently selected item in the right panel
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // camera / capture
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);


  // preview state BEFORE adding to gallery:
  // previewFile: file chosen/captured
  // previewUrl: local object URL for preview
  // previewSource: 'new' | 'gallery' (if choosing existing)
  // previewGalleryId: if previewSource === 'gallery', this is that item id
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<"new" | "gallery" | null>(null);
  const [previewGalleryId, setPreviewGalleryId] = useState<string | null>(null);

  // modal for choosing from gallery
  const [isChoosingFromGallery, setIsChoosingFromGallery] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // small util id maker
  const makeId = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;


  // ---------- gallery add / duplicate check ----------
  const isDuplicateFile = (file: File) => {
    // basic duplicate check: same name & size (simple & practical)
    return gallery.some((it) => it.file.name === file.name && it.file.size === file.size);
  };

  async function detectAndGenerateRecipe(file: File): Promise<{ recipe: Recipe | null; error?: string }> {
    const form = new FormData();
    form.append("file", file);
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const resp = await fetch(`${apiBaseUrl}/detect_and_generate`, {
        method: "POST",
        body: form,
    });
    const data = await resp.json();
    if (data.error) {
      return { recipe: null, error: data.error };
    }
    return { recipe: data.recipe as Recipe };
    } catch (err) {
      return { recipe: null, error: "Network error" };
      }
  }


  const processItemWithBackend = async (id: string, file: File) => {
    setGallery((g) =>
      g.map(it => it.id === id ? { ...it, status: "processing", error: null } : it)
    );
    const res = await detectAndGenerateRecipe(file);

    if (res.recipe) {
      setGallery((g) =>
        g.map(it => it.id === id ? { ...it, status: "done", recipe: res.recipe, error: null } : it)
      );
    } else {
      setGallery((g) =>
        g.map(it => it.id === id ? { ...it, status: "error", error: res.error || "Unknown error" } : it)
      );
    }
  };


  const addFileToGallery = async (file: File) => {
    // skip identical duplicates
    if (isDuplicateFile(file)) {
    const existing = gallery.find((it) =>
      it.file.name === file.name && it.file.size === file.size
    )!;
    setSelectedId(existing.id);
    await processItemWithBackend(existing.id, existing.file); // reprocess duplicate
    return existing.id;
  }

  const id = makeId();
  const url = URL.createObjectURL(file);
  const item: GalleryItem = {
    id,
    file,
    url,
    status: "processing",
    createdAt: Date.now(),
    recipe: null,
  };
  setGallery((g) => [item, ...g]);
  setSelectedId(id);

  await processItemWithBackend(id, file);
  return id;
  };

    // ---------- upload / preview flows ----------
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // set preview (new file)
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewSource("new");
      setPreviewGalleryId(null);
      // reset input value to allow same file reselect (in case)
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

  // ---------- camera ----------
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable.");
    }
  };

  useEffect(() => {
    if (cameraOn && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    // cleanup on unmount is handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    // capture
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      // preview the captured photo (new)
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewSource("new");
      setPreviewGalleryId(null);
      stopCamera();
    }, "image/jpeg");
  };

  // ---------- choose from gallery ---------

  const chooseFromGallery = async (id: string) => {
    const item = gallery.find((g) => g.id === id);
    if (!item) return;
    if (!item.url && item.file) {
      const newUrl = URL.createObjectURL(item.file);
      setGallery((g) => g.map((it) => it.id === id ? { ...it, url: newUrl } : it));
      // Also set the previewUrl to the newly created URL
      setPreviewUrl(newUrl);
    } else {
      setPreviewUrl(item.url);
    }
    // preview existing gallery item (but do NOT create duplicate)
    setPreviewFile(item.file);
    setPreviewUrl(item.url);
    setPreviewSource("gallery");
    setPreviewGalleryId(id);

    setSelectedId(id);

    setIsChoosingFromGallery(false);

    if (!item.recipe && item.status !== "processing" && item.status !== "error") {
      await processItemWithBackend(id, item.file);
    }
  };

  // ---------- generate recipe (from preview) ----------
  const generateRecipeFromPreview = async () => {
    if (!previewUrl) return;
    if (previewSource === "gallery" && previewGalleryId) {
      const galleryItem = gallery.find(i => i.id === previewGalleryId);
      if (galleryItem) {
        await processItemWithBackend(previewGalleryId, galleryItem.file);
      }
      setSelectedId(previewGalleryId);
      clearPreview();
      return;
    }
    if (previewFile && previewSource === "new") {
      await addFileToGallery(previewFile);
      clearPreview();
      return;
    }
  };


  // ---------- cancel / clear preview ----------
  const clearPreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewSource(null);
    setPreviewGalleryId(null);
    // ensure camera off
    stopCamera();
  };

  // ---------- select / remove gallery ----------
  const selectGalleryItem = (id: string) => {
    setSelectedId(id);
    // if item is done already, right panel will show recipe; if processing, shows progress
  };

  const removeGalleryItem = (id: string) => {
    setGallery((g) => {
      const target = g.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return g.filter((it) => it.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
    // if preview was this gallery item, clear preview
    if (previewGalleryId === id) clearPreview();
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      gallery.forEach((it) => URL.revokeObjectURL(it.url));
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = gallery.find((it) => it.id === selectedId) ?? null;

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdfa] to-[#fff6ee] p-6 flex flex-col items-center text-gray-800">
      {/* subtle floating orbs */}
      <motion.div
        className="pointer-events-none absolute top-8 left-8 w-56 h-56 bg-orange-200 rounded-full blur-3xl opacity-20"
        animate={{ y: [0, 18, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-8 right-8 w-72 h-72 bg-red-200 rounded-full blur-3xl opacity-16"
        animate={{ y: [0, -18, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
      />
      
      <FridgeMateHeader />

      {/* MAIN */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Upload/Card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl bg-[#fffaf6] p-6 shadow-[8px_8px_22px_#ebe1d8,-8px_-8px_22px_#ffffff] flex flex-col gap-6 transition-all duration-300 hover:scale-105"
        >
          <div className="text-center">
            <h2 className="text-lg font-semibold text-orange-600">Upload / Scan</h2>
            <p className="text-sm text-gray-600 mt-1">Upload, capture, or choose from gallery to generate recipes.</p>
          </div>

          {/* upload card */}
          <div className="rounded-2xl bg-[#fff3e9] p-6 shadow-inner flex flex-col items-center gap-4">
            {/* preview area - if a preview exists show it with confirm/cancel */}
            {previewUrl ? (
              <>
              <img src={previewUrl} alt="preview" className="w-full max-h-64 object-contain rounded-lg border border-orange-100 shadow" />
              <div className="flex gap-3 w-full mt-3">
                <button
                onClick={() => { void generateRecipeFromPreview(); }}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
                >
                  Generate Recipe
                </button>
                <button
                onClick={clearPreview}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
              </>
            ) : (
              // default (no preview): show three centered buttons with Scan prominent
              <>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-gray-700 font-medium">Ready to scan or upload</p>
                  <div className="text-sm text-gray-500">PNG / JPG / WEBP — max 10MB</div>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

                <div className="flex items-center gap-4 mt-3">
                  {/* prominent Scan button center */}
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg transform hover:scale-105 transition"
                    title="Scan (camera)"
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      <span className="font-semibold">Scan</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setIsChoosingFromGallery(true)}
                    className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg transform hover:scale-105 transition flex items-center gap-2"
                    title="Choose from gallery"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
                    Gallery
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg transform hover:scale-105 transition flex items-center gap-2"
                    title="Upload from device"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </>
            )}

            {/* camera view (if cameraOn and no preview) */}
            {cameraOn && !previewUrl && (
              <div className="w-full mt-4 flex flex-col items-center gap-3">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg h-64 object-cover" />
                <div className="flex gap-3 w-full">
                  <button onClick={capturePhoto} className="flex-1 py-2 bg-green-500 text-white rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Capture
                  </button>
                  <button onClick={stopCamera} className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* tips */}
          <div className="rounded-2xl p-4 bg-white border border-orange-50 shadow-sm flex gap-3 items-start transition-all duration-300 hover:scale-[1.02]">
            <Lightbulb className="w-6 h-6 text-yellow-500 mt-1" />
            <div>
              <div className="font-semibold text-gray-700">Quick Tips</div>
              <div className="text-sm text-gray-600 mt-1">
                • Use natural light for clearer recognition.<br />
                • Hold camera steady or prop your phone.<br />
                • Include multiple ingredients together for combo meals.
              </div>
            </div>
          </div>

          {/* gallery */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Gallery</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {gallery.length === 0 && (
                <div className="col-span-3 text-sm text-gray-500">
                  No uploads yet — processed images will appear here.
                </div>
              )}

              {gallery.map((it) => (
                <div
                key={it.id}
                className={`relative group rounded-xl overflow-hidden border ${
                  selectedId === it.id ? "ring-2 ring-orange-300" : "border-orange-100"
                }`}
            >
              
              {/* 🖼️ Image Click → Opens Preview Only */}
              <img
              src={it.url}
              alt="thumb"
              className="w-full h-24 object-cover cursor-zoom-in"
              onClick={() => setPreviewImage(it.url)} // 👈 show larger image
              />

             {/* 🗑️ Remove button with confirmation */}
             <button
             onClick={() => {
              const confirmDelete = window.confirm("Are you sure you want to delete this image?");
              if (confirmDelete) removeGalleryItem(it.id);
            }}
            className="absolute top-1 right-1 bg-white/80 hover:bg-red-100 p-1.5 rounded-full hidden group-hover:block transition"
            title="Remove"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
           </button>

           {/* 🔘 Status pill */}
           <div className="absolute left-1 bottom-1 px-2 py-0.5 rounded bg-white/80 text-xs text-gray-600">
           {it.status === "processing" ? "Processing" : "Ready"}
           </div>
          </div>
          ))}
        </div>
      </div>

      </motion.section>

        {/* RIGHT: Suggested Recipe */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-3xl bg-[#fffaf6] p-6 shadow-[8px_8px_22px_#ebe1d8,-8px_-8px_22px_#ffffff] flex flex-col gap-6 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-orange-600">Suggested Recipe</h2>
            <div className="text-sm text-gray-500">
              {selected ? (selected.status === "processing" ? "Processing..." : "Ready") : "No image selected"}
            </div>
          </div>

          <div className="rounded-2xl bg-[#fff3e9] p-5 shadow-inner min-h-[220px] flex flex-col">
            {!selected && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-3">
                <div className="text-sm">Select a gallery image or upload one to see suggestions.</div>
              </div>
            )}

            {selected && selected.status === "processing" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="text-orange-600 font-semibold">Processing image...</div>
                <div className="text-sm text-gray-600">Analyzing ingredients. This takes a couple seconds.</div>
                <motion.div
                  className="mt-4 w-36 h-2 bg-orange-100 rounded-full overflow-hidden"
                  animate={{ x: ["-100%", "0%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-full h-full bg-orange-400" />
                </motion.div>
              </div>
            )}

            {selected && selected.status === "done" && selected.recipe && (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <img src={selected.url} alt="selected" className="w-28 h-20 rounded-md object-cover border border-orange-100" />
                  <div>
                    <h3 className="font-bold text-gray-800">{selected.recipe.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">A quick recipe based on your uploaded ingredients.</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Ingredients</h4>
                  <ul className="list-disc ml-5 text-sm text-gray-600">
                    {selected.recipe.ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mt-4">Steps</h4>
                  <ol className="list-decimal ml-5 text-sm text-gray-600">
                    {selected.recipe.steps?.map((step, i) => <li key={i}>{ step }</li>)}
                  </ol>
                </div>

                <button onClick={() => { setSelectedId(null); }} className="mt-3 py-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg transform hover:scale-105 transition">Done</button>
              </div>
            )}

            {selected && selected.status === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-red-600">
                <span className="font-semibold">Error generating recipe.</span>
              </div>
            )}

          </div>
        </motion.section>
      </div>

      {/* Choose from gallery modal */}
      {isChoosingFromGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-xl max-w-xl w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Choose from Gallery</h3>
              <button onClick={() => setIsChoosingFromGallery(false)} className="text-sm text-gray-500">Close</button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {gallery.length === 0 && <div className="col-span-3 text-sm text-gray-500">No gallery items yet.</div>}
              {gallery.map((it) => (
                <div key={it.id} className="rounded-lg overflow-hidden border">
                  <button onClick={() => chooseFromGallery(it.id)} className="block w-full h-full">
                    <img src={it.url} alt="choose" className="w-full h-24 object-cover" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 🔍 Full-size preview modal */}
      {previewImage && (
        <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        onClick={() => setPreviewImage(null)} // click outside to close
        >
          <img
          src={previewImage}
          alt="Preview"
          className="max-w-full max-h-[90vh] rounded-lg shadow-lg"
          onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <FridgeMateFooter />
    </div>
  );
}




