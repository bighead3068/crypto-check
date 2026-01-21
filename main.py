from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('index.html')

@app.get("/favicon.ico")
async def favicon():
    return FileResponse('static/favicon.ico') if os.path.exists('static/favicon.ico') else ("", 204)

# Catch-all route for SPA client-side routing
# This must be the last route defined
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Check if the file exists in static (though static is mounted separately, 
    # sometimes relative paths in code might try to hit root)
    # But primarily this is to serve index.html for any non-api, non-static path
    return FileResponse('index.html')

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
