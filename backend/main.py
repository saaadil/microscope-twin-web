"""
Microscope Twin Web App - Backend API
=====================================
FastAPI application that serves ONNX model inference for microscope images.

How this works:
1. Receives an uploaded microscope image file from the frontend via HTTP POST.
2. Reads the modality choice ('brightfield' or 'fluorescence') selected by the user.
3. Checks if the requested ONNX model exists in backend/models/.
   - If missing, immediately returns an informative error instructing the user
     to place brightfield.onnx or fluorescence.onnx into backend/models/.
4. Preprocesses the image into a numpy tensor:
   grayscale -> resize (224, 224) -> scale [0, 1] -> normalize (mean=0.5, std=0.5) -> shape (1, 1, 224, 224) NCHW.
5. Runs the ONNX model using ONNX Runtime.
6. Returns exactly the 3 model output numbers as generic fields: p1, p2, p3.
"""

import io
import os
from typing import Dict, Any, Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image
import onnxruntime as ort

# ---------------------------------------------------------------------------
# 1. FastAPI Application Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Microscope Twin Web App API",
    description="Runs ONNX model inference for brightfield/fluorescence microscope images and returns 3 parameters.",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# 2. CORS (Cross-Origin Resource Sharing) Middleware
#    Allows the Vite dev server (typically http://localhost:5173) to call this
#    backend running on http://localhost:8000 without browser security blocks.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits requests from any origin during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 3. Model Directory & Inspection
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Cache for loaded ONNX inference sessions to avoid re-reading files on every request
onnx_sessions: Dict[str, ort.InferenceSession] = {}


def get_model_path(modality: str) -> str:
    """Returns the expected filesystem path for a given modality model."""
    filename = f"{modality.lower().strip()}.onnx"
    return os.path.join(MODELS_DIR, filename)


def check_models_present() -> Dict[str, bool]:
    """Checks whether brightfield.onnx and fluorescence.onnx are present on disk."""
    return {
        "brightfield": os.path.isfile(get_model_path("brightfield")),
        "fluorescence": os.path.isfile(get_model_path("fluorescence")),
    }


def get_onnx_session(modality: str) -> ort.InferenceSession:
    """
    Retrieves or lazily loads the ONNX Runtime session for the chosen modality.
    If the .onnx file is missing, raises HTTP 404 with instructions.
    """
    key = modality.lower().strip()
    if key not in ("brightfield", "fluorescence"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid modality '{modality}'. Allowed options: 'brightfield', 'fluorescence'."
        )

    model_path = get_model_path(key)
    if not os.path.exists(model_path):
        raise HTTPException(
            status_code=404,
            detail="Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/"
        )

    if key not in onnx_sessions:
        # Load the ONNX model into memory using ONNX Runtime with CPU execution
        onnx_sessions[key] = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])

    return onnx_sessions[key]


# ---------------------------------------------------------------------------
# 4. Image Preprocessing
# ---------------------------------------------------------------------------
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Converts raw uploaded image bytes into a tensor for ONNX inference.
    Pipeline: grayscale -> resize 224x224 -> scale to [0,1] -> normalize (mean=0.5, std=0.5) -> shape (1, 1, 224, 224) NCHW.
    """
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        # 1. Convert to grayscale (single channel)
        pil_img = pil_img.convert("L")

        # 2. Resize to 224x224 bilinear
        target_size = (224, 224)
        pil_img = pil_img.resize(target_size, Image.Resampling.BILINEAR)

        # 3. Convert to numpy float32 array in [0.0, 1.0]
        arr = np.array(pil_img, dtype=np.float32) / 255.0

        # 4. Normalization with scalar mean=0.5, std=0.5 for single channel
        arr = (arr - 0.5) / 0.5

        # 5. Format tensor to shape (1, 1, 224, 224) [Batch, Channel, Height, Width]
        tensor = arr[np.newaxis, np.newaxis, :, :]
        return tensor
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not decode or preprocess image: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 5. API Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """
    Health check endpoint:
    Returns the server status and whether each required model is present on disk.
    """
    models_status = check_models_present()
    all_ready = models_status["brightfield"] and models_status["fluorescence"]
    return {
        "status": "ready" if all_ready else "awaiting_models",
        "models": models_status,
        "message": (
            "All models present." if all_ready
            else "Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/"
        )
    }


@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    modality: str = Form(...)
) -> Dict[str, Any]:
    """
    Inference endpoint:
    - Verifies model existence
    - Preprocesses the uploaded image
    - Runs the ONNX model
    - Returns strictly the 3 output values under generic names p1, p2, p3
    """
    # 1. Check model availability first and fail with clean error message if missing
    session = get_onnx_session(modality)

    # 2. Read image content
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 3. Preprocess image
    input_tensor = preprocess_image(image_bytes)

    # 4. Run ONNX Inference
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    outputs = session.run([output_name], {input_name: input_tensor})

    # 5. Extract the 3 numbers
    raw_preds = outputs[0]
    # Flatten if batched
    flat_preds = np.array(raw_preds).flatten()
    if len(flat_preds) < 3:
        raise HTTPException(
            status_code=500,
            detail=f"Model output shape mismatch: expected at least 3 numbers, got {len(flat_preds)}"
        )

    p1 = float(flat_preds[0])
    p2 = float(flat_preds[1])
    p3 = float(flat_preds[2])

    # 6. Return strictly the 3 numbers under generic field names p1, p2, p3
    return {
        "success": True,
        "filename": file.filename,
        "modality": modality.lower().strip(),
        "p1": round(p1, 5),
        "p2": round(p2, 5),
        "p3": round(p3, 5)
    }
