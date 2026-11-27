#!/usr/bin/env python3
"""PSNR between two images.

Usage: img_diff.py <a> <b> [min_db]  -> prints "PSNR xx.xx dB"; exit 1 if below min_db (default: never fails).
"""
import sys

import numpy as np
from PIL import Image


def psnr(a: str, b: str) -> float:
    """Peak signal-to-noise ratio in dB between two same-sized images (inf when identical)."""
    x = np.asarray(Image.open(a).convert("RGB"), dtype=np.float64)
    y = np.asarray(Image.open(b).convert("RGB"), dtype=np.float64)
    if x.shape != y.shape:
        raise ValueError(f"size mismatch: {x.shape} vs {y.shape}")
    mse = float(((x - y) ** 2).mean())
    return float("inf") if mse == 0 else 10.0 * float(np.log10(255.0 ** 2 / mse))


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    v = psnr(argv[0], argv[1])
    print(f"PSNR {v:.2f} dB")
    return 1 if len(argv) > 2 and v < float(argv[2]) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
