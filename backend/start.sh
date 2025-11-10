#!/bin/bash
# Start script for Render deployment

# Run database migrations if needed (currently not used)
# python migrate.py

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

