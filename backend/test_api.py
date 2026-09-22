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
    with patch("backend.main.check_models_present", return_value={"brightfield": False, "fluorescence": False}):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "awaiting_models"
        assert data["models"]["brightfield"] is False
        assert data["models"]["fluorescence"] is False
        assert "Model not found — place brightfield.onnx and fluorescence.onnx in backend/models/" in data["message"]
        print("PASS: Health check reports missing models correctly.")

def test_predict_returns_error_when_model_missing():
    with patch("os.path.exists", return_value=False):
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

def test_preprocessing_pipeline():
    from backend.main import preprocess_image
    # 1. Test dimensions and channels
    img = Image.new("RGB", (100, 150), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    tensor = preprocess_image(buf.getvalue())
    assert tensor.shape == (1, 1, 224, 224), f"Expected shape (1, 1, 224, 224), got {tensor.shape}"

    # 2. Test scalar normalization: mean=0.5, std=0.5
    zero_img = Image.new("L", (50, 50), color=0)
    zbuf = io.BytesIO()
    zero_img.save(zbuf, format="PNG")
    ztensor = preprocess_image(zbuf.getvalue())
    assert ztensor.shape == (1, 1, 224, 224)
    np.testing.assert_allclose(ztensor.min(), -1.0, atol=1e-5)
    np.testing.assert_allclose(ztensor.max(), -1.0, atol=1e-5)

    white_img = Image.new("L", (50, 50), color=255)
    wbuf = io.BytesIO()
    white_img.save(wbuf, format="PNG")
    wtensor = preprocess_image(wbuf.getvalue())
    assert wtensor.shape == (1, 1, 224, 224)
    np.testing.assert_allclose(wtensor.min(), 1.0, atol=1e-5)
    np.testing.assert_allclose(wtensor.max(), 1.0, atol=1e-5)
    print("PASS: Preprocessing pipeline satisfies grayscale -> resize 224x224 -> [0,1] -> mean=0.5, std=0.5 -> (1,1,224,224) NCHW.")

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

        print("PASS: API returns strictly generic p1, p2, p3 with no derived metrics.")

if __name__ == "__main__":
    test_health_check_missing_models()
    test_predict_returns_error_when_model_missing()
    test_preprocessing_pipeline()
    test_predict_response_structure_with_mock_session()
    print("ALL TESTS PASSED! Backend strictly adheres to user specifications.")
