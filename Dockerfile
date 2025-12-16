# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python Runtime
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
# If no requirements file, we install manually (I'll create one)
RUN pip install flask flask-cors werkzeug

# Copy Backend Code
COPY backend/ ./backend/

# Copy Built Frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment
ENV DATA_DIR=/data
ENV DB_PATH=/data/gamesaves.db
ENV STATIC_FOLDER=/app/frontend/dist
ENV FLASK_APP=backend/app.py

# Volume
VOLUME ["/data"]

# Expose
EXPOSE 8300

# Run
CMD ["python", "backend/app.py"]
