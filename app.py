from api import app
from core import config

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.SERVER_PORT)
