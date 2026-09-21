import React from "react";
import { Sun, Sparkles } from "lucide-react";

/**
 * ModalitySelector Component
 * --------------------------
 * Beginners guide:
 * Optical microscopes operate in different illumination/contrast regimes:
 * - Brightfield: Transmitted light directly through the specimen.
 * - Fluorescence: Laser or mercury lamp excitation causing fluorescent fluorophores to emit light.
 *
 * This component allows the user to select which ONNX model the backend should execute:
 * - 'brightfield' -> loads brightfield.onnx
 * - 'fluorescence' -> loads fluorescence.onnx
 */
export default function ModalitySelector({ modality, onChange, disabled }) {
  return (
    <div className="card">
      <div className="card-title">
        <span>2. Imaging Modality</span>
        <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
          {modality === "brightfield" ? "Brightfield" : "Fluorescence"}
        </span>
      </div>
      <p className="card-subtitle">
        Select the matching optical configuration to load the calibrated ONNX model.
      </p>

      <div className="modality-group">
        <button
          type="button"
          disabled={disabled}
          className={`modality-btn ${modality === "brightfield" ? "selected" : ""}`}
          onClick={() => onChange("brightfield")}
          id="btn-modality-brightfield"
        >
          <Sun size={24} color={modality === "brightfield" ? "#38bdf8" : "#94a3b8"} />
          <span className="modality-title">Brightfield</span>
          <span className="modality-desc">Transmission illumination contrast</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          className={`modality-btn ${modality === "fluorescence" ? "selected" : ""}`}
          onClick={() => onChange("fluorescence")}
          id="btn-modality-fluorescence"
        >
          <Sparkles size={24} color={modality === "fluorescence" ? "#10b981" : "#94a3b8"} />
          <span className="modality-title">Fluorescence</span>
          <span className="modality-desc">Laser/emission fluorophore excitation</span>
        </button>
      </div>
    </div>
  );
}
