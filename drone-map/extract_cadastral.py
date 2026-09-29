#!/usr/bin/env python3
"""
Root wrapper pointing to scripts/extract_cadastral.py
"""
import sys
from pathlib import Path

scripts_dir = Path(__file__).parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from extract_cadastral import main

if __name__ == "__main__":
    main()
