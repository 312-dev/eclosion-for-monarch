#!/bin/bash
# Local DAST testing script - mirrors the CI security scan

set -e

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
  echo "Attempt $i/30..."
  sleep 2
done

echo ""
echo "=== Running OWASP ZAP Baseline Scan ==="
docker run --rm --network=host \
  -v "$(pwd)":/zap/wrk/:rw \
  -e ZAP_AUTH_HEADER="X-Forwarded-Proto" \
  -e ZAP_AUTH_HEADER_VALUE="https" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://localhost:5001 -c .zap/rules.tsv -a

EXIT_CODE=$?

echo ""
echo "=== Cleanup ==="
docker stop eclosion-dast 2>/dev/null || true
docker rm eclosion-dast 2>/dev/null || true

exit $EXIT_CODE
