import React from "react";
import { AlertTriangle, FolderGit2, Play } from "lucide-react";

/**
 * MissingModelAlert Component
 * ----------------------------
 * Beginners guide:
 * As requested, the repository does NOT bundle fake/placeholder ONNX models.
 * backend/models/ starts as an empty folder with .gitkeep.
 *
 * When the backend detects that brightfield.onnx or fluorescence.onnx are missing,
 * this component displays clear, actionable guidance on where to place your real ONNX models.
 *
 * It also provides a "Test UI with Demo Numbers" button so you can explore the 3D surface
 * visualization immediately while your model files are being prepared.
 */
export default function MissingModelAlert({ onUseDemoValues }) {
  return (
    <div className="alert-box">
      <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent-amber)" }} />
      <div className="alert-content">
        <div className="alert-title">
          Model Not Found — Place ONNX Models in backend/models/
        </div>
        <p style={{ marginTop: "4px", fontSize: "0.84rem", lineHeight: "1.4" }}>
          The backend requires your trained ONNX models to perform inference. To run against real models:
        </p>
        <div className="alert-code">
          cp /path/to/your/brightfield.onnx backend/models/brightfield.onnx<br />
          cp /path/to/your/fluorescence.onnx backend/models/fluorescence.onnx
        </div>
        <p style={{ marginTop: "10px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Want to test the 3D pupil surface visualization right now? You can load representative demo values:
        </p>
        <div style={{ marginTop: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onUseDemoValues}
            style={{ color: "var(--accent-cyan)", borderColor: "rgba(56, 189, 248, 0.3)" }}
            id="btn-use-demo-values"
          >
            <Play size={14} />
            Test 3D Visualization with Demo Numbers
          </button>
        </div>
      </div>
    </div>
  );
}
