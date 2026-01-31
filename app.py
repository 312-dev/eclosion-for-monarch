import os
import sys

# Handle --version flag BEFORE importing Flask to avoid initialization overhead
# This allows Electron to quickly verify the backend binary is valid
if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "--version":
    # Read version from APP_VERSION env var (passed by Electron) or fallback
    version = os.environ.get("APP_VERSION", "0.0.0")
    print(version)
    sys.exit(0)

from api import app
from core import config

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.SERVER_PORT)
