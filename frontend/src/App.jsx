import React, { useState, useEffect } from "react";
import { Microscope, Activity, Play, AlertCircle, RefreshCw } from "lucide-react";
import ImageUpload from "./components/ImageUpload";
import ModalitySelector from "./components/ModalitySelector";
import ResultsDisplay from "./components/ResultsDisplay";
import PupilSurface3D from "./components/PupilSurface3D";
import MissingModelAlert from "./components/MissingModelAlert";

/**
 * App Component (Main Entry Point)
 * =================================
 * Beginners guide:
 * This is the root component of the React frontend application.
 * It manages:
 * 1. The selected image file (held in component state `file`).
 * 2. The chosen optical modality ('brightfield' or 'fluorescence').
 * 3. Communication with the FastAPI backend (POST /api/predict).
 * 4. Error states (e.g., when ONNX models are missing from backend/models/).
 * 5. Delivering the 3 returned model numbers (p1, p2, p3) to both the numerical
 *    readout and the interactive 3D WebGL pupil surface renderer.
 */

// URL where the FastAPI backend runs locally
const BACKEND_URL = "http://localhost:8000";

export default function App() {
  // Application State
  const [file, setFile] = useState(null);
  const [modality, setModality] = useState("brightfield");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking"); // 'checking' | 'ready' | 'awaiting_models' | 'offline'

  // 1. Check backend connectivity and model readiness on page load
  const checkBackendHealth = async () => {
    try {
      setBackendStatus("checking");
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data.status); // 'ready' or 'awaiting_models'
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // 2. Submit image and modality to backend for inference
  const handleAnalyze = async () => {
    if (!file) {
      setErrorMessage("Please upload a microscope image first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Build multipart/form-data payload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("modality", modality);

      const response = await fetch(`${BACKEND_URL}/api/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend returned an error (e.g. 404 Model Not Found)
        const detail = data.detail || "Prediction request failed.";
        setErrorMessage(detail);
        return;
      }

      // Success: backend returns generic fields p1, p2, p3
      setResults({
        p1: data.p1,
        p2: data.p2,
        p3: data.p3,
      });
    } catch (err) {
      setErrorMessage(
        `Failed to reach backend server at ${BACKEND_URL}. Ensure uvicorn is running.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Fallback demo values for beginners to preview the 3D surface immediately
  const handleUseDemoValues = () => {
    setResults({
      p1: -0.385,
      p2: 0.215,
      p3: 0.165,
    });
    setErrorMessage(null);
  };

  return (
    <div className="app-container">
      {/* Top Navigation / Brand Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Microscope size={26} />
          </div>
          <div className="brand-titles">
            <h1>Microscope Digital Twin</h1>
            <p>ONNX Optical Inference & 3D Pupil Surface Reconstruction</p>
          </div>
        </div>

        {/* Backend Connection Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {backendStatus === "ready" && (
            <div className="status-pill status-ready" id="status-indicator">
              <span className="status-dot"></span>
              <span>Backend Ready (ONNX Models Active)</span>
            </div>
          )}

          {backendStatus === "awaiting_models" && (
            <div className="status-pill status-waiting" id="status-indicator">
              <span className="status-dot"></span>
              <span>Backend Online (Awaiting Models)</span>
            </div>
          )}

          {backendStatus === "offline" && (
            <div className="status-pill status-error" id="status-indicator">
              <span className="status-dot"></span>
              <span>Backend Offline (Port 8000)</span>
            </div>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={checkBackendHealth}
            title="Refresh backend status"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      {/* Missing Models / Actionable Alert Banner */}
      {(backendStatus === "awaiting_models" || (errorMessage && errorMessage.includes("backend/models/"))) && (
        <MissingModelAlert onUseDemoValues={handleUseDemoValues} />
      )}

      {/* General Error Banner */}
      {errorMessage && !errorMessage.includes("backend/models/") && (
        <div className="alert-box error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div className="alert-content">
            <div className="alert-title">Inference Notice</div>
            <p style={{ fontSize: "0.84rem" }}>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Two-Column Dashboard Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Input Form (Upload, Modality, Analyze Button) */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ImageUpload
            selectedFile={file}
            onFileSelect={(selected) => {
              setFile(selected);
              setErrorMessage(null);
            }}
            onClear={() => {
              setFile(null);
              setResults(null);
            }}
          />

          <ModalitySelector
            modality={modality}
            onChange={(m) => setModality(m)}
            disabled={isLoading}
          />

          <button
            type="button"
            className="btn-primary"
            disabled={!file || isLoading}
            onClick={handleAnalyze}
            id="btn-analyze"
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Running ONNX Model...</span>
              </>
            ) : (
              <>
                <Activity size={18} />
                <span>Analyze Microscope Image</span>
              </>
            )}
          </button>
        </section>

        {/* Right Column: Inference Results & 3D WebGL Pupil Surface */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ResultsDisplay results={results} modality={modality} />
          <PupilSurface3D parameters={results} />
        </section>
      </main>
    </div>
  );
}
