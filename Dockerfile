# syntax=docker/dockerfile:1

# Build arguments for versioning
ARG BUILD_TIME=unknown
ARG GIT_SHA=unknown
ARG VERSION=dev
ARG RELEASE_CHANNEL=dev

# Stage 1: Build frontend
# Pin to digest for reproducible builds (Dependabot will update this)
FROM node:20-alpine@sha256:fcbb8f7d018707c656a4da2eea8a15f2893d2258093fea9ff2ea5ea1cba82112 AS frontend-builder

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
# Pin to digest for reproducible builds (Dependabot will update this)
FROM cgr.dev/chainguard/python:latest-dev@sha256:e74973526261c4ad07fb144bc1636f1b4b2d19f2c74d311a2040cb520276ca08 AS python-builder

WORKDIR /app

# Copy requirements (PyPI packages with hashes + VCS packages)
COPY requirements.txt requirements-vcs.txt ./

# Install Python dependencies to a virtual environment
# This allows us to copy just the installed packages to the runtime image
# PyPI packages are hash-verified for supply chain security
# VCS packages (monarchmoney) are installed separately without hash verification
RUN python -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir --require-hashes -r requirements.txt && \
    /app/venv/bin/pip install --no-cache-dir --no-deps -r requirements-vcs.txt

# Stage 3: Runtime with minimal Chainguard image
# This image has 0-5 CVEs typically vs 800+ in python:3.12-slim
# Pin to digest for reproducible builds (Dependabot will update this)
FROM cgr.dev/chainguard/python:latest@sha256:95d87904ddeb9ad7eb4c534f93640504dae1600f2d68dca9ba62c2f2576952bf

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

# Copy virtual environment from builder (owned by nonroot user)
COPY --from=python-builder --chown=65532:65532 /app/venv /app/venv

# Set PATH to use the virtual environment
ENV PATH="/app/venv/bin:$PATH"

# Copy Python source (owned by nonroot user)
COPY --chown=65532:65532 *.py ./
COPY --chown=65532:65532 services/ ./services/
COPY --chown=65532:65532 core/ ./core/

# Copy state module with nonroot ownership (UID 65532) so app can write data files
# Note: /app/state should be mounted as a volume for persistent data
# Docker: docker run -v eclosion-data:/app/state ...
# Railway: Configure via dashboard Settings → Volumes
COPY --chown=65532:65532 state/ ./state/

# Copy built frontend from builder stage (owned by nonroot user)
COPY --from=frontend-builder --chown=65532:65532 /app/frontend/dist ./static

# Expose port
EXPOSE 5001

# Override Chainguard's default entrypoint to use venv Python with installed packages
ENTRYPOINT ["/app/venv/bin/python"]
CMD ["app.py"]
