import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";

/**
 * ImageUpload Component
 * ---------------------
 * Beginners guide:
 * This component provides an interactive dropzone for users to:
 * 1. Drag and drop microscope images (PNG, JPG, TIFF, etc.) or click to browse.
 * 2. Previews the selected image using an in-memory Object URL (URL.createObjectURL).
 * 3. Shows file metadata (filename, file size, dimensions).
 * 4. Lets the user clear or re-select an image.
 */
export default function ImageUpload({ selectedFile, onFileSelect, onClear }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const fileInputRef = useRef(null);

  // When a file is chosen, create a local preview URL and read its resolution
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, TIFF, BMP).");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Read natural width and height
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.width, height: img.height });
    };
    img.src = url;

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClear();
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>1. Microscope Image</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {selectedFile ? "Ready for analysis" : "Required"}
        </span>
      </div>
      <p className="card-subtitle">
        Upload a high-resolution raw micrograph from your acquisition system.
      </p>

      {!selectedFile ? (
        <div
          className={`dropzone ${isDragOver ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          id="image-dropzone"
        >
          <UploadCloud className="dropzone-icon" size={38} />
          <p className="dropzone-text">Click to browse or drag & drop micrograph</p>
          <p className="dropzone-hint">Supported formats: PNG, TIFF, JPG, BMP (up to 50MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="preview-container">
            <img src={previewUrl} alt="Micrograph preview" className="preview-image" />
            <button
              className="preview-clear-btn"
              onClick={handleClear}
              title="Remove image"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
          <div className="preview-info">
            <span>{selectedFile.name}</span>
            <span>
              {(selectedFile.size / 1024).toFixed(1)} KB
              {dimensions ? ` • ${dimensions.width}×${dimensions.height}px` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
