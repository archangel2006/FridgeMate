from ultralytics import YOLO
from collections import Counter
import os

_model = None

def load_model(model_path="yolov8n.pt"):
    """Load YOLO model. Downloads automatically if not found."""
    if not os.path.exists(model_path):
        print("🔽 YOLOv8n model not found — downloading automatically...")
    # With torch<=2.5.x pinned in requirements, weights_only defaults to False — no patching needed
    model = YOLO(model_path)
    return model

def get_cached_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model

def detect_ingredients(image_path):
    model = get_cached_model()
    try:
        results = model(image_path, verbose=False)
        res = results[0]
        if not hasattr(res, "boxes") or res.boxes is None or len(res.boxes) == 0:
            return {"ingredients": []}
        class_ids = res.boxes.cls.tolist()
        detected_items = [res.names[int(i)] for i in class_ids]
        counts = Counter(detected_items)
        return {
            "ingredients": [{"name": name, "count": count} for name, count in counts.items()]
        }
    except Exception as e:
        print(f"Error running YOLO: {e}")
        return {"ingredients": [], "error": str(e)}
