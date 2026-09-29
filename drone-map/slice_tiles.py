#!/usr/bin/env python3
"""
Root wrapper pointing to scripts/slice_tiles.py
"""
import sys
from pathlib import Path

# Add scripts directory to path and run
scripts_dir = Path(__file__).parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from slice_tiles import main

if __name__ == "__main__":
    main()
