import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, Maximize2, Eye, Sliders } from "lucide-react";

/**
 * PupilSurface3D Component
 * ------------------------
 * Beginners guide:
 * In microscopy and optical digital twin systems, the "pupil" refers to the circular aperture
 * at the objective rear focal plane where light wavefronts pass through.
 *
 * This component visualizes the 3D deformation surface across that circular unit disk (radius <= 1)
 * using WebGL via Three.js.
 *
 * MATHEMATICAL SURFACE CALCULATION & DISCLAIMER:
 * ===============================================
 * NOTE: The exact physical mapping of the 3 model coefficients (p1, p2, p3) has NOT yet been
 * confirmed by the model author. As requested, we use the standard Zernike polynomial terms
 * (defocus-like, astigmatism-like, and spherical-like) as the provisional best-guess mathematical
 * model to synthesize a continuous 3D phase surface:
 *
 *   W(rho, theta) = p1 * (2*rho^2 - 1)
 *                 + p2 * (rho^2 * cos(2*theta))
 *                 + p3 * (6*rho^4 - 6*rho^2 + 1)
 *
 * This formulation is strictly a provisional mathematical approximation and is not presented
 * as confirmed fact in the user interface.
 */

// Simple scientific colormap: maps normalized value t in [0, 1] to RGB Color
function getColormapColor(t) {
  // Turbo-like smooth gradient from dark blue -> cyan -> yellow -> red
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.sin(clamped * Math.PI * 0.9);
  const g = Math.sin(clamped * Math.PI * 0.95);
  const b = Math.cos(clamped * Math.PI * 0.5);
  return new THREE.Color(
    Math.max(0.1, Math.min(1.0, 0.2 + 0.8 * r)),
    Math.max(0.1, Math.min(1.0, g * 0.95)),
    Math.max(0.1, Math.min(1.0, b * 0.9))
  );
}

export default function PupilSurface3D({ parameters }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const controlsRef = useRef({
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
    spherical: { radius: 3.2, theta: Math.PI / 4, phi: Math.PI / 3 },
    autoRotate: true,
  });

  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [verticalScale, setVerticalScale] = useState(1.0);
  const [peakValley, setPeakValley] = useState({ min: -1, max: 1 });

  // Safe fallback if parameters not yet received
  const p1 = parameters ? parameters.p1 : 0.0;
  const p2 = parameters ? parameters.p2 : 0.0;
  const p3 = parameters ? parameters.p3 : 0.0;

  // Initialize Three.js Scene once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#060911");
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;

    // Position camera using spherical coordinates
    const updateCameraPosition = () => {
      const { radius, theta, phi } = controlsRef.current.spherical;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(3, 5, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight2.position.set(-3, -3, -2);
    scene.add(dirLight2);

    // 5. Circular Pupil Perimeter Ring (radius = 1.0)
    const ringGeom = new THREE.RingGeometry(0.995, 1.015, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    scene.add(ringMesh);

    // Subtle reference grid below
    const grid = new THREE.GridHelper(2.4, 12, 0x1e293b, 0x0f172a);
    grid.position.y = -0.8;
    scene.add(grid);

    // 6. Mouse Orbit & Zoom Event Handlers
    const onMouseDown = (e) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.prevMouseX = e.clientX;
      controlsRef.current.prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!controlsRef.current.isDragging) return;
      const deltaX = e.clientX - controlsRef.current.prevMouseX;
      const deltaY = e.clientY - controlsRef.current.prevMouseY;
      controlsRef.current.prevMouseX = e.clientX;
      controlsRef.current.prevMouseY = e.clientY;

      controlsRef.current.spherical.theta -= deltaX * 0.008;
      // Clamp phi so camera does not flip over top or bottom
      controlsRef.current.spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, controlsRef.current.spherical.phi - deltaY * 0.008)
      );
      updateCameraPosition();
    };

    const onMouseUp = () => {
      controlsRef.current.isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      controlsRef.current.spherical.radius = Math.max(
        1.5,
        Math.min(7.0, controlsRef.current.spherical.radius + e.deltaY * 0.002)
      );
      updateCameraPosition();
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // 7. Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (controlsRef.current.autoRotate && !controlsRef.current.isDragging) {
        controlsRef.current.spherical.theta += 0.004;
        updateCameraPosition();
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Handle Window Resizing
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Update or Rebuild Pupil Surface Mesh when parameters or controls change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove existing mesh if present
    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
      meshRef.current = null;
    }

    // Grid resolution for circular pupil disk
    const rings = 50;
    const segments = 64;
    const vertices = [];
    const colors = [];
    const indices = [];

    // Calculate raw height values across the pupil disk
    // Using provisional best-guess mathematical surface model:
    // W(rho, theta) = p1*(2*rho^2 - 1) + p2*(rho^2 * cos(2*theta)) + p3*(6*rho^4 - 6*rho^2 + 1)
    let minZ = Infinity;
    let maxZ = -Infinity;

    const rawHeights = [];

    // Center vertex (rho = 0)
    // At rho = 0: W = p1*(-1) + p2*(0) + p3*(1) = -p1 + p3
    const centerZ = -p1 + p3;
    rawHeights.push({ x: 0, y: centerZ, z: 0, height: centerZ });
    minZ = Math.min(minZ, centerZ);
    maxZ = Math.max(maxZ, centerZ);

    for (let r = 1; r <= rings; r++) {
      const rho = r / rings; // 0 < rho <= 1
      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const x = rho * Math.cos(theta);
        const y = rho * Math.sin(theta);

        // Provisional mathematical model:
        const term1 = 2 * rho * rho - 1;
        const term2 = rho * rho * Math.cos(2 * theta);
        const term3 = 6 * Math.pow(rho, 4) - 6 * rho * rho + 1;
        const zValue = p1 * term1 + p2 * term2 + p3 * term3;

        rawHeights.push({ x, y, zValue, rho, theta });
        minZ = Math.min(minZ, zValue);
        maxZ = Math.max(maxZ, zValue);
      }
    }

    const range = maxZ - minZ || 1.0;
    setPeakValley({ min: minZ, max: maxZ });

    // Build geometry vertices and colors
    // Note: Three.js Y is up, so we map pupil plane to (X, Z) and wavefront deformation to Y!
    // Center vertex:
    const centerNorm = (centerZ - minZ) / range;
    const centerCol = getColormapColor(centerNorm);
    vertices.push(0, centerZ * verticalScale * 0.35, 0);
    colors.push(centerCol.r, centerCol.g, centerCol.b);

    let idx = 1;
    for (let r = 1; r <= rings; r++) {
      for (let s = 0; s < segments; s++) {
        const h = rawHeights[idx];
        const norm = (h.zValue - minZ) / range;
        const col = getColormapColor(norm);

        // Position: X = x, Y = height * scale, Z = y (laying flat on optical plane)
        vertices.push(h.x, h.zValue * verticalScale * 0.35, h.y);
        colors.push(col.r, col.g, col.b);
        idx++;
      }
    }

    // Build triangular faces (indices)
    // 1. Center fan
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;
      indices.push(0, 1 + s, 1 + nextS);
    }

    // 2. Ring quads (two triangles per quad)
    for (let r = 1; r < rings; r++) {
      const innerStart = 1 + (r - 1) * segments;
      const outerStart = 1 + r * segments;
      for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        const i0 = innerStart + s;
        const i1 = innerStart + nextS;
        const i2 = outerStart + s;
        const i3 = outerStart + nextS;

        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Material with vertex coloring
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1,
      wireframe: wireframe,
    });

    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    sceneRef.current.add(mesh);
  }, [p1, p2, p3, verticalScale, wireframe]);

  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    controlsRef.current.autoRotate = next;
  };

  const handleResetCamera = () => {
    controlsRef.current.spherical = { radius: 3.2, theta: Math.PI / 4, phi: Math.PI / 3 };
    if (cameraRef.current) {
      const { radius, theta, phi } = controlsRef.current.spherical;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>3D Pupil Surface Visualization</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Interactive WebGL
        </span>
      </div>
      <p className="card-subtitle">
        Provisional continuous 3D phase surface over the circular entrance pupil (ρ ≤ 1).
      </p>

      <div className="canvas-wrapper" ref={containerRef}>
        {/* Canvas Toolbar Controls */}
        <div className="canvas-toolbar">
          <button
            type="button"
            className={`canvas-tool-btn ${autoRotate ? "active" : ""}`}
            onClick={handleToggleAutoRotate}
            title="Toggle Auto-Rotation"
          >
            <RotateCw size={13} />
            <span>{autoRotate ? "Rotate: ON" : "Rotate: OFF"}</span>
          </button>

          <button
            type="button"
            className={`canvas-tool-btn ${wireframe ? "active" : ""}`}
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe"
          >
            <Eye size={13} />
            <span>{wireframe ? "Mesh" : "Surface"}</span>
          </button>

          <button
            type="button"
            className="canvas-tool-btn"
            onClick={handleResetCamera}
            title="Reset Camera View"
          >
            <Maximize2 size={13} />
            <span>Reset View</span>
          </button>
        </div>

        {/* Height / Phase Colormap Legend */}
        <div className="canvas-legend">
          <span>Provisional Wavefront Phase</span>
          <div className="legend-bar"></div>
          <div className="legend-labels">
            <span>{peakValley.min.toFixed(2)}</span>
            <span>0.00</span>
            <span>+{peakValley.max.toFixed(2)}</span>
          </div>
        </div>

        {/* Height Amplitude Scale Slider */}
        <div className="scale-slider-box">
          <Sliders size={13} />
          <span>Scale: {verticalScale.toFixed(1)}x</span>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={verticalScale}
            onChange={(e) => setVerticalScale(parseFloat(e.target.value))}
            title="Adjust 3D deformation amplitude scale"
          />
        </div>
      </div>

      <div className="disclaimer-note">
        Interactive controls: Click & drag to rotate 360° • Mouse wheel to zoom • Scale slider adjusts 3D height exaggeration.
      </div>
    </div>
  );
}
