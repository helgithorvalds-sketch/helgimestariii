#!/usr/bin/env python3
"""Black/white frame guard for rendered stills.

Usage: still_check.py <jpg>...  -> prints "path mean_luma"; exit 1 if any is < 0.08 or > 0.92.
"""
import sys

import numpy as np
from PIL import Image

LOW, HIGH = 0.08, 0.92


def mean_luma(path: str) -> float:
    """Mean Rec.709 luma of an image, 0..1."""
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0
    return float((rgb @ np.array([0.2126, 0.7152, 0.0722])).mean())


def main(argv):
    bad = False
    for p in argv:
        m = mean_luma(p)
        print(f"{p} {m:.3f}")
        if m < LOW or m > HIGH:
            bad = True
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
