"""
test_api.py
------------
Automated tests to verify the FastAPI backend:
1. Health check returns 'awaiting_models' when models are absent.
2. /api/predict returns 404 with exact instructions when models are absent.
3. Tests inference response schema:
   - Verifies generic output fields: 'p1', 'p2', 'p3'
   - Confirms absence of unconfirmed labels (defocus, astigmatism, spherical)
   - Confirms absence of derived metrics (rms_wavefront_error, strehl_ratio)
"""

import io
from unittest.mock import MagicMock, patch
from PIL import Image
from fastapi.testclient import TestClient
import numpy as np

from backend.main import app

client = TestClient(app)

def test_health_check_missing_models():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "awaiting_models"
    assert data["models"]["brightfield"] is False
    assert data["models"]["fluorescence"] is False
    assert "Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/" in data["message"]
    print("PASS: Health check reports missing models correctly.")

def test_predict_returns_error_when_model_missing():
    img = Image.new("RGB", (64, 64), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    res = client.post(
        "/api/predict",
        data={"modality": "brightfield"},
        files={"file": ("test.png", buf.getvalue(), "image/png")}
    )
    assert res.status_code == 404
    data = res.json()
    assert data["detail"] == "Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/"
    print("PASS: /api/predict returns exact 404 message when models are absent.")

def test_predict_response_structure_with_mock_session():
    # Mock ONNX session returning 3 dummy values: [0.123, -0.456, 0.789]
    mock_session = MagicMock()
    mock_input = MagicMock()
    mock_input.name = "input_image"
    mock_output = MagicMock()
    mock_output.name = "output_tensor"
    mock_session.get_inputs.return_value = [mock_input]
    mock_session.get_outputs.return_value = [mock_output]
    mock_session.run.return_value = [np.array([[0.12345, -0.45678, 0.78901]], dtype=np.float32)]

    with patch("backend.main.get_onnx_session", return_value=mock_session):
        img = Image.new("RGB", (64, 64), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        res = client.post(
            "/api/predict",
            data={"modality": "brightfield"},
            files={"file": ("sample.png", buf.getvalue(), "image/png")}
        )
        assert res.status_code == 200
        data = res.json()

        # Strict checks:
        # 1. p1, p2, p3 exist
        assert "p1" in data and data["p1"] == 0.12345
        assert "p2" in data and data["p2"] == -0.45678
        assert "p3" in data and data["p3"] == 0.78901
        assert data["modality"] == "brightfield"

        # 2. Derived metrics MUST NOT exist
        assert "rms_wavefront_error" not in data
        assert "strehl_ratio" not in data
        assert "diagnostics" not in data

        # 3. Zernike labels MUST NOT exist in the API response
        assert "defocus" not in data
        assert "astigmatism" not in data
        assert "spherical" not in data

        print("PASS: API returns strictly generic p1, p2, p3 with no derived metrics or unconfirmed labels.")

if __name__ == "__main__":
    test_health_check_missing_models()
    test_predict_returns_error_when_model_missing()
    test_predict_response_structure_with_mock_session()
    print("ALL TESTS PASSED! Backend strictly adheres to user specifications.")
