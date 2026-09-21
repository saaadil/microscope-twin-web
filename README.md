# Microscope Digital Twin — Web App

A web application designed for microscope optical analysis:
- **Frontend**: React + Vite + Three.js
- **Backend**: FastAPI + ONNX Runtime
- **Single-page layout**: No routing, no auth, no database.

---

## 🌟 Application Architecture

```
microscope-twin-web/
├── backend/
│   ├── .venv/               # Isolated Python virtual environment
│   ├── models/              # Directory for your trained ONNX models
│   │   └── .gitkeep         # Keeps directory in Git (empty until models are added)
│   ├── main.py              # FastAPI server, ONNX inference, and image preprocessing
│   ├── test_api.py          # Automated backend test suite
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.jsx        # Drag-and-drop micrograph upload & preview
│   │   │   ├── ModalitySelector.jsx   # Brightfield vs Fluorescence toggle
│   │   │   ├── ResultsDisplay.jsx     # Numerical readouts (p1, p2, p3)
│   │   │   ├── PupilSurface3D.jsx     # Three.js 3D WebGL pupil surface
│   │   │   └── MissingModelAlert.jsx  # Guidance banner when models are absent
│   │   ├── App.jsx          # Root dashboard component connecting state & API
│   │   ├── index.css        # Scientific dark theme stylesheet
│   │   └── main.jsx         # React DOM entry point
│   ├── package.json         # Node.js dependencies (three, lucide-react, vite)
│   └── vite.config.js       # Vite build configuration
└── README.md
```

---

## 🚀 Quick Start (Linux Bash)

### 1. Backend Setup & Run

Open a Linux bash terminal and navigate to the project root:

```bash
cd /home/saaadil/ml_workspace/microscope-twin-web

# 1. Activate the backend virtual environment
source backend/.venv/bin/activate

# 2. Run the FastAPI backend server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will start at `http://127.0.0.1:8000`.
- Health check: `curl http://127.0.0.1:8000/api/health`
- Interactive API docs (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup & Run

Open a **second** terminal:

```bash
cd /home/saaadil/ml_workspace/microscope-twin-web/frontend

# Run the Vite development server
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🔬 How to Supply Your Trained ONNX Models

The backend intentionally starts with `backend/models/` empty (no fake or placeholder models). When models are missing, the backend returns:

```
"Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/"
```

Copy your trained ONNX models into `backend/models/`:

```bash
cp /path/to/your/brightfield.onnx backend/models/brightfield.onnx
cp /path/to/your/fluorescence.onnx backend/models/fluorescence.onnx
```

Once placed, the backend automatically detects them without requiring a restart!

> [!TIP]
> You can also click **"Test 3D Visualization with Demo Numbers"** in the web interface at any time to interactively explore and rotate the 3D pupil surface before your models are finalized.

---

## 🧩 Detailed Component Explanations (For Beginners)

### Backend (`backend/main.py`)
1. **FastAPI & CORS**:
   - Initializes the REST API.
   - Enables `CORSMiddleware` so the Vite frontend (port 5173) can talk to port 8000 without cross-origin browser security restrictions.
2. **Model Availability Check**:
   - `check_models_present()` inspects `backend/models/` for `brightfield.onnx` and `fluorescence.onnx`.
   - If missing, `/api/predict` returns HTTP 404 with instructions.
3. **Image Preprocessing**:
   - Receives raw image bytes from multipart file upload.
   - Marked with `# TODO: confirm exact values against the model's training pipeline before trusting output` (dimensions, normalization mean/std, color channels).
4. **ONNX Inference**:
   - Uses `onnxruntime.InferenceSession` with `CPUExecutionProvider` for fast, lightweight execution without large PyTorch runtime dependencies.
5. **Generic Outputs**:
   - Returns strictly `{ "p1": ..., "p2": ..., "p3": ... }`.
   - No unconfirmed physical labels (defocus, astigmatism, spherical) or invented metrics.

### Frontend (`frontend/src/`)
1. **`ImageUpload.jsx`**:
   - Provides drag-and-drop and file input for microscope images.
   - Generates an in-memory preview using `URL.createObjectURL(file)`.
   - Displays image resolution and file size.
2. **`ModalitySelector.jsx`**:
   - Switches between Brightfield (transmission illumination) and Fluorescence (laser excitation).
3. **`ResultsDisplay.jsx`**:
   - Renders the 3 output values labeled as:
     - `Coefficient 1 (provisional — mapping not yet confirmed)`
     - `Coefficient 2 (provisional — mapping not yet confirmed)`
     - `Coefficient 3 (provisional — mapping not yet confirmed)`
4. **`PupilSurface3D.jsx` (Three.js WebGL Surface)**:
   - Visualizes the microscope circular entrance pupil ($\rho \le 1$).
   - Calculates vertex height using the provisional best-guess Zernike surface equation:
     $$W(\rho, \theta) = p_1 (2\rho^2 - 1) + p_2 (\rho^2 \cos(2\theta)) + p_3 (6\rho^4 - 6\rho^2 + 1)$$
   - Includes mouse click-and-drag 360° orbit rotation, scroll zoom, height scale slider, wireframe toggle, auto-rotation, and scientific colormapping.
5. **`MissingModelAlert.jsx`**:
   - Displays clear guidance when ONNX models are absent and lets the user test with demo values immediately.

---

## 🧪 Automated Testing

To run the automated backend test suite:

```bash
cd /home/saaadil/ml_workspace/microscope-twin-web
PYTHONPATH=. backend/.venv/bin/python backend/test_api.py
```

The test validates:
- [x] Health check status reporting when models are absent.
- [x] Exact 404 error response when inference is attempted without models.
- [x] Strict compliance of inference response (only `p1`, `p2`, `p3`; no unconfirmed labels or derived metrics).
