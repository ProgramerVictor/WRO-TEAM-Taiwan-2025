# 🐳 Docker Deployment Guide

## Quick Start with Docker

### Option 1: Docker Compose (Easiest)

1. **Create `.env` file** (copy from example):
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-nano
MQTT_BROKER=broker.emqx.io
MQTT_PORT=1883
MQTT_PUB_TOPIC=robot/events
MQTT_REPLY_TOPIC=robot/reply
```

2. **Start the container**:
```bash
docker-compose up -d
```

3. **Check logs**:
```bash
docker-compose logs -f
```

4. **Test the API**:
```bash
curl http://localhost:8000/mqtt/broker
```

5. **Stop the container**:
```bash
docker-compose down
```

---

### Option 2: Docker CLI

1. **Build the image**:
```bash
docker build -t xiaoka-backend .
```

2. **Run the container**:
```bash
docker run -d \
  --name xiaoka-backend \
  -p 8000:8000 \
  -e OPENAI_API_KEY=your-key-here \
  -e OPENAI_MODEL=gpt-4.1-nano \
  -e MQTT_BROKER=broker.emqx.io \
  xiaoka-backend
```

3. **Check logs**:
```bash
docker logs -f xiaoka-backend
```

4. **Stop the container**:
```bash
docker stop xiaoka-backend
docker rm xiaoka-backend
```

---

## 🚀 Deploying to Render with Docker

### Method 1: Using Dockerfile (Recommended for consistency)

1. **Update `render.yaml`** - Uncomment Docker settings:
```yaml
services:
  - type: web
    name: xiaoka-backend
    env: docker  # Changed from python
    dockerfilePath: ./Dockerfile  # Add this line
```

2. **Push to GitHub and deploy** as usual

### Method 2: Python Native (Default)
Keep `render.yaml` as is - Render will use requirements.txt

---

## 🔧 Dockerfile Explanation

```dockerfile
# Base image - Python 3.11 slim (smaller, faster)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1  # Don't create .pyc files
ENV PYTHONUNBUFFERED=1          # Real-time logs
ENV PORT=8000                    # Default port

# Install system dependencies (gcc for some Python packages)
RUN apt-get update && apt-get install -y gcc

# Copy and install Python dependencies first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user (security best practice)
RUN useradd -m -u 1000 appuser
USER appuser

# Expose port
EXPOSE ${PORT}

# Health check (auto-restart if unhealthy)
HEALTHCHECK CMD python -c "import requests; requests.get('http://localhost:${PORT}/mqtt/broker')"

# Start command
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
```

---

## 🏗️ Docker Compose Features

### Development Mode (Hot Reload)
```yaml
# In docker-compose.yml
volumes:
  - ./:/app  # Mount current directory
command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode
```yaml
# In docker-compose.yml
# Remove volumes mount
command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## 🧪 Testing Docker Build Locally

### Test build:
```bash
docker build -t xiaoka-backend:test .
```

### Test run:
```bash
docker run --rm \
  -p 8000:8000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  xiaoka-backend:test
```

### Test health check:
```bash
# Wait 40 seconds for startup
sleep 40
docker inspect --format='{{.State.Health.Status}}' xiaoka-backend
```

---

## 📊 Docker Image Size Optimization

### Current Setup:
- Base: `python:3.11-slim` (~150MB)
- Dependencies: ~200MB
- **Total: ~350MB** ✅

### Further Optimization (Optional):
```dockerfile
# Use Alpine (much smaller, but may have compatibility issues)
FROM python:3.11-alpine
# Total: ~200MB
```

---

## 🔐 Security Best Practices

### ✅ Implemented:
- Non-root user (`appuser`)
- No sensitive data in image
- Minimal base image (slim)
- Health checks
- Environment variables for secrets

### 🛡️ Additional (Optional):
```dockerfile
# Read-only root filesystem
docker run --read-only xiaoka-backend

# Drop capabilities
docker run --cap-drop ALL xiaoka-backend

# Limit resources
docker run --memory="512m" --cpus="1" xiaoka-backend
```

---

## 🚀 Multi-Stage Build (Advanced)

For even smaller images:

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 🐛 Troubleshooting

### Build fails - "gcc not found"
```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y gcc python3-dev
```

### Container exits immediately
```bash
# Check logs
docker logs xiaoka-backend

# Common issue: Missing OPENAI_API_KEY
docker run -e OPENAI_API_KEY=sk-... xiaoka-backend
```

### Health check failing
```bash
# Check if port is exposed
docker port xiaoka-backend

# Test manually inside container
docker exec -it xiaoka-backend curl http://localhost:8000/mqtt/broker
```

### Can't connect from host
```bash
# Ensure correct port mapping
docker run -p 8000:8000 xiaoka-backend

# Check if container is running
docker ps
```

---

## 📦 Docker Hub Deployment (Optional)

### 1. Build and tag:
```bash
docker build -t yourusername/xiaoka-backend:latest .
docker build -t yourusername/xiaoka-backend:v1.0.0 .
```

### 2. Push to Docker Hub:
```bash
docker login
docker push yourusername/xiaoka-backend:latest
docker push yourusername/xiaoka-backend:v1.0.0
```

### 3. Deploy anywhere:
```bash
docker run -d \
  -p 8000:8000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  yourusername/xiaoka-backend:latest
```

---

## 🎯 Which Deployment Method to Use?

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Docker Compose** | Local development | Easy, reproducible | Local only |
| **Render (Python)** | Quick deploy | Fastest setup | Less control |
| **Render (Docker)** | Consistency | Same everywhere | Slower builds |
| **Docker Hub** | Multiple platforms | Portable | Need registry |

### Recommendation:
- **Development**: Docker Compose
- **Production (Render)**: Python native (faster)
- **Production (Other)**: Docker image

---

## ✅ Docker Deployment Checklist

- [ ] `.env` file created with OPENAI_API_KEY
- [ ] Docker installed and running
- [ ] `docker-compose.yml` reviewed
- [ ] Build succeeds: `docker build -t xiaoka-backend .`
- [ ] Container starts: `docker-compose up -d`
- [ ] Health check passes: `docker ps` (shows "healthy")
- [ ] API responds: `curl http://localhost:8000/mqtt/broker`
- [ ] WebSocket works: Test with frontend
- [ ] Logs look good: `docker-compose logs -f`

---

## 🎓 Docker Commands Cheat Sheet

```bash
# Build
docker build -t xiaoka-backend .

# Run
docker run -d --name xiaoka -p 8000:8000 xiaoka-backend

# Logs
docker logs -f xiaoka

# Shell access
docker exec -it xiaoka bash

# Stop
docker stop xiaoka

# Remove
docker rm xiaoka

# Clean up
docker system prune -a

# Docker Compose
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # Logs
docker-compose restart    # Restart
docker-compose ps         # Status
```

---

## 📚 Additional Resources

- Docker Documentation: https://docs.docker.com
- Render Docker Guide: https://render.com/docs/docker
- Docker Hub: https://hub.docker.com
- Docker Compose: https://docs.docker.com/compose

---

**Created**: November 2025  
**Docker Version**: 20.10+  
**Tested on**: Windows, Linux, macOS

