#!/usr/bin/env python3
"""
Script de entrada para o SPR 1.1
"""

import sys
from pathlib import Path

# Adiciona o diretório app ao PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent / 'app'))

from main import main

if __name__ == "__main__":
    sys.exit(main()) 