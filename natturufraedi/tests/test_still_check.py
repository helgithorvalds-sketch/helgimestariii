import subprocess, sys, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
CLI = str(ROOT / "tools" / "still_check.py")


def make(tmp_path, value):
    p = tmp_path / f"f{value}.jpg"
    Image.new("RGB", (64, 64), (value,) * 3).save(p, quality=100)
    return str(p)


def run(path):
    return subprocess.run([sys.executable, CLI, path], capture_output=True, text=True).returncode


def test_black_frame_fails(tmp_path):
    from still_check import mean_luma
    p = make(tmp_path, 0)
    assert abs(mean_luma(p) - 0.0) <= 0.02
    assert run(p) == 1


def test_white_frame_fails(tmp_path):
    from still_check import mean_luma
    p = make(tmp_path, 255)
    assert abs(mean_luma(p) - 1.0) <= 0.02
    assert run(p) == 1


def test_mid_grey_passes(tmp_path):
    from still_check import mean_luma
    p = make(tmp_path, 128)
    assert abs(mean_luma(p) - 0.5) <= 0.02
    assert run(p) == 0
