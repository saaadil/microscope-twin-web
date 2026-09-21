import React from "react";
import { Info, CheckCircle2 } from "lucide-react";

/**
 * ResultsDisplay Component
 * ------------------------
 * Beginners guide:
 * This component displays the 3 raw numerical outputs returned from the ONNX model.
 *
 * IMPORTANT NOTE ON NAMING:
 * Per project specifications, the physical optical mapping of these 3 outputs has not
 * yet been confirmed by the model builder. Therefore, they are labeled strictly as:
 * - Coefficient 1 (provisional — mapping not yet confirmed)
 * - Coefficient 2 (provisional — mapping not yet confirmed)
 * - Coefficient 3 (provisional — mapping not yet confirmed)
 * No unconfirmed physical labels (such as defocus, astigmatism, or spherical) are used.
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
      numberLabel: "Coefficient 1",
      value: p1,
      tag: "p₁"
    },
    {
      id: "coeff-2",
      numberLabel: "Coefficient 2",
      value: p2,
      tag: "p₂"
    },
    {
      id: "coeff-3",
      numberLabel: "Coefficient 3",
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
            <span className="provisional-badge">
              provisional — mapping not yet confirmed
            </span>
          </div>
        ))}
      </div>

      <div className="disclaimer-note">
        <Info size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
        Note: Output parameters (p₁, p₂, p₃) are raw model outputs. Physical aberration mapping
        is provisional and pending final validation from the model development team.
      </div>
    </div>
  );
}
