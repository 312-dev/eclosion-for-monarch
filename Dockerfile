# syntax=docker/dockerfile:1

# Build arguments for versioning
ARG BUILD_TIME=unknown
ARG GIT_SHA=unknown
ARG VERSION=dev
ARG RELEASE_CHANNEL=dev

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Python backend with frontend assets
FROM python:3.12-slim

# Re-declare build args for this stage
ARG BUILD_TIME=unknown
ARG GIT_SHA=unknown
ARG VERSION=dev
ARG RELEASE_CHANNEL=dev

# Set environment variables for the application
ENV BUILD_TIME=${BUILD_TIME}
ENV GIT_SHA=${GIT_SHA}
ENV APP_VERSION=${VERSION}
ENV RELEASE_CHANNEL=${RELEASE_CHANNEL}

# Create non-root user for security
RUN groupadd -r eclosion && useradd -r -g eclosion eclosion

WORKDIR /app

# Install system dependencies for building some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies and create state directory with secure permissions
RUN pip install --no-cache-dir -r requirements.txt && \
    mkdir -p /app/state && chown eclosion:eclosion /app/state && chmod 700 /app/state

# Copy Python source
COPY --chown=eclosion:eclosion *.py ./
COPY --chown=eclosion:eclosion services/ ./services/
COPY --chown=eclosion:eclosion state/ ./state/
COPY --chown=eclosion:eclosion core/ ./core/

# Copy built frontend from builder stage
COPY --from=frontend-builder --chown=eclosion:eclosion /app/frontend/dist ./static

# Note: /app/state should be mounted as a volume for persistent data
# Docker: docker run -v eclosion-data:/app/state ...
# Railway: Configure via dashboard Settings → Volumes

# Switch to non-root user
USER eclosion

# Expose port
EXPOSE 5001

# Default command
CMD ["python3", "app.py"]
