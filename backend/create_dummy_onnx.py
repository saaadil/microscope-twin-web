"""
create_dummy_onnx.py
--------------------
Generates a lightweight, throwaway ONNX file ('backend/test_dummy.onnx')
with random/dummy operations for testing the end-to-end web app pipeline:
  Micrograph Upload -> FastAPI -> Preprocessing -> ONNX Inference -> JSON (p1, p2, p3) -> 3D Pupil Surface

NOTE:
THIS IS NOT A REAL TRAINED MODEL. It contains dummy weights and operations
purely to verify that the file upload, input tensor shape (1, 3, 224, 224),
and 3-number output format (1, 3) work seamlessly across frontend and backend.
"""

import os
import numpy as np
import onnx
from onnx import helper, TensorProto

def make_dummy_onnx(output_path: str):
    # 1. Define input: 'input_image' with shape [batch_size, 3, 224, 224]
    input_tensor = helper.make_tensor_value_info(
        "input_image",
        TensorProto.FLOAT,
        ["batch_size", 3, 224, 224]
    )

    # 2. Define output: 'output' with shape [batch_size, 3]
    output_tensor = helper.make_tensor_value_info(
        "output",
        TensorProto.FLOAT,
        ["batch_size", 3]
    )

    # 3. Dummy weights for a linear projection from 3 pooled channels -> 3 outputs
    # Random dummy weights: shape (3, 3)
    np.random.seed(42)
    weight_data = np.random.uniform(-0.5, 0.5, (3, 3)).astype(np.float32)
    bias_data = np.array([0.15, -0.25, 0.35], dtype=np.float32)

    weight_init = helper.make_tensor(
        name="dummy_weights",
        data_type=TensorProto.FLOAT,
        dims=[3, 3],
        vals=weight_data.flatten().tolist()
    )

    bias_init = helper.make_tensor(
        name="dummy_bias",
        data_type=TensorProto.FLOAT,
        dims=[3],
        vals=bias_data.tolist()
    )

    # 4. Graph nodes:
    # Node 1: GlobalAveragePool (reduces 224x224 spatial dimensions to 1x1)
    pool_node = helper.make_node(
        "GlobalAveragePool",
        inputs=["input_image"],
        outputs=["pooled_features"]
    )

    # Node 2: Flatten (shape becomes [batch_size, 3])
    flatten_node = helper.make_node(
        "Flatten",
        inputs=["pooled_features"],
        outputs=["flat_features"],
        axis=1
    )

    # Node 3: Gemm (flat_features * dummy_weights + dummy_bias -> shape [batch_size, 3])
    gemm_node = helper.make_node(
        "Gemm",
        inputs=["flat_features", "dummy_weights", "dummy_bias"],
        outputs=["output"],
        alpha=1.0,
        beta=1.0
    )

    # 5. Assemble Graph and Model
    graph = helper.make_graph(
        nodes=[pool_node, flatten_node, gemm_node],
        name="MicroscopeDummyTestGraph",
        inputs=[input_tensor],
        outputs=[output_tensor],
        initializer=[weight_init, bias_init]
    )

    model = helper.make_model(
        graph,
        producer_name="microscope-twin-test-dummy",
        opset_imports=[helper.make_opsetid("", 17)],
        ir_version=9
    )

    onnx.checker.check_model(model)
    onnx.save(model, output_path)
    print(f"SUCCESS: Created throwaway test model at: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    # 1. Generate models/brightfield.onnx
    bf_path = os.path.join(models_dir, "brightfield.onnx")
    make_dummy_onnx(bf_path)

    # 2. Generate models/fluorescence.onnx
    fl_path = os.path.join(models_dir, "fluorescence.onnx")
    make_dummy_onnx(fl_path)

