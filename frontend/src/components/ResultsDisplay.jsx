import React from "react";
import { Info, CheckCircle2 } from "lucide-react";

/**
 * ResultsDisplay Component
 * ------------------------
 * Displays the 3 optical aberration parameters predicted by the ONNX model:
 * - Defocus (p₁)
 * - Astigmatism (p₂)
 * - Coma (p₃)
 */
export default function ResultsDisplay({ results, modality }) {
  if (!results) {
    return (
      <div className="card" style={{ opacity: 0.7 }}>
        <div className="card-title">
          <span>Model Output Parameters</span>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Upload a microscope image and click "Analyze Image" to run inference and display the 3 model output coefficients.
        </p>
      </div>
    );
  }

  const { p1, p2, p3 } = results;

  const items = [
    {
      id: "coeff-1",
      numberLabel: "Defocus",
      value: p1,
      tag: "p₁"
    },
    {
      id: "coeff-2",
      numberLabel: "Astigmatism",
      value: p2,
      tag: "p₂"
    },
    {
      id: "coeff-3",
      numberLabel: "Coma",
      value: p3,
      tag: "p₃"
    }
  ];

  return (
    <div className="card">
      <div className="card-title">
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle2 size={18} color="var(--accent-emerald)" />
          Model Output Parameters
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
          Model: {modality}
        </span>
      </div>

      <div className="results-grid">
        {items.map((item) => (
          <div key={item.id} className="coeff-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="coeff-tag">{item.numberLabel}</span>
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                {item.tag}
              </span>
            </div>
            <div className="coeff-value">{typeof item.value === "number" ? item.value.toFixed(5) : item.value}</div>
          </div>
        ))}
      </div>

      <div className="disclaimer-note">
        <Info size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
        Note: Optical aberration parameters (Defocus, Astigmatism, Coma) are predicted directly from the input microscope image.
      </div>
    </div>
  );
}
