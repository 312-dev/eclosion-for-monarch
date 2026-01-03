#!/bin/bash
# Local DAST testing script - mirrors the CI security scan

set -e

# Cleanup function
cleanup() {
  echo ""
  echo "=== Cleanup ==="
  docker stop eclosion-dast 2>/dev/null || true
  docker rm eclosion-dast 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Building Docker image ==="
docker build -t eclosion:test .

echo ""
echo "=== Starting application ==="
docker run -d --name eclosion-dast -p 5001:5001 eclosion:test

echo ""
echo "=== Waiting for application to be healthy ==="
for i in {1..30}; do
  if curl -sf -H "X-Forwarded-Proto: https" http://localhost:5001/health > /dev/null 2>&1; then
    echo "Application is healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "ERROR: Application failed to start"
    echo "=== Container logs ==="
    docker logs eclosion-dast 2>&1
    exit 1
  fi
  echo "Attempt $i/30..."
  sleep 2
done

echo ""
echo "=== Running OWASP ZAP Baseline Scan ==="

# Detect OS - macOS needs host.docker.internal, Linux can use --network=host
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS: --network=host doesn't work, use host.docker.internal
  TARGET_URL="http://host.docker.internal:5001"
  NETWORK_OPTS=""
else
  # Linux: --network=host works
  TARGET_URL="http://localhost:5001"
  NETWORK_OPTS="--network=host"
fi

docker run --rm $NETWORK_OPTS \
  -v "$(pwd)":/zap/wrk/:rw \
  -e ZAP_AUTH_HEADER="X-Forwarded-Proto" \
  -e ZAP_AUTH_HEADER_VALUE="https" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$TARGET_URL" -c .zap/rules.tsv -a
