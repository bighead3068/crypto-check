import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Fix: Use absolute path for robustness
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI()

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)

# Serve React App
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, 'index.html'))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
