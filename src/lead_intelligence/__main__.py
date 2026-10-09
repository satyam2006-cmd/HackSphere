"""Railway / production entry point.

Adds ``src/`` to sys.path so ``lead_intelligence`` is importable regardless of
how the container's PYTHONPATH is configured, then starts Uvicorn.
"""

import os
import sys
from pathlib import Path

# Ensure the src directory is on the Python path
_src_dir = str(Path(__file__).resolve().parent.parent)
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(
        "lead_intelligence.api:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
