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

# Stage 2: Build Python dependencies
# Use Chainguard's dev image which includes pip and build tools
FROM cgr.dev/chainguard/python:latest-dev AS python-builder

WORKDIR /app

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies to a virtual environment
# This allows us to copy just the installed packages to the runtime image
RUN python -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 3: Runtime with minimal Chainguard image
# This image has 0-5 CVEs typically vs 800+ in python:3.12-slim
FROM cgr.dev/chainguard/python:latest

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

# Chainguard images run as non-root by default (UID 65532)
# No need to create a user

WORKDIR /app

# Copy virtual environment from builder
COPY --from=python-builder /app/venv /app/venv

# Set PATH to use the virtual environment
ENV PATH="/app/venv/bin:$PATH"

# Copy Python source
COPY *.py ./
COPY services/ ./services/
COPY core/ ./core/

# Copy state module with nonroot ownership (UID 65532) so app can write data files
# Note: /app/state should be mounted as a volume for persistent data
# Docker: docker run -v eclosion-data:/app/state ...
# Railway: Configure via dashboard Settings → Volumes
COPY --chown=65532:65532 state/ ./state/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose port
EXPOSE 5001

# Override Chainguard's default entrypoint to use venv Python with installed packages
ENTRYPOINT ["/app/venv/bin/python"]
CMD ["app.py"]
