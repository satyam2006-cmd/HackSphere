"""Root entrypoint for production hosting (Railway / Render / Heroku / Docker).

Ensures `src/` is in sys.path and starts the FastAPI server on `0.0.0.0:$PORT`.
"""

import os
import sys
from pathlib import Path

# Add src/ to Python module path
root_dir = Path(__file__).resolve().parent
src_dir = root_dir / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from lead_intelligence.api import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    print(f"Starting HackSphere FastAPI server on 0.0.0.0:{port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
