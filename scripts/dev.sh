#!/bin/bash
#
# Eclosion Dev Mode - Hot Reload Development
#
# Starts all services in the correct order:
# 1. Flask backend (port 5002 - avoids conflict with production on 5001)
# 2. Vite frontend (port 5174 - avoids conflict with production on 5173)
# 3. Electron app
#
# Uses the Beta app's state directory for shared data/credentials.
# All output is logged to dev.log in the project root.
#
# Usage: ./scripts/dev.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEV_LOG="$PROJECT_ROOT/dev.log"

STATE_DIR="$HOME/Library/Application Support/Eclosion Beta"

# Clear and initialize dev.log
echo "=== Eclosion Dev Mode Started: $(date) ===" > "$DEV_LOG"
echo "Project root: $PROJECT_ROOT" >> "$DEV_LOG"
echo "" >> "$DEV_LOG"

# Redirect all output to both terminal and dev.log
exec > >(tee -a "$DEV_LOG") 2>&1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to find an available port in a range
# Returns the first available port, or empty if none found
find_available_port() {
    local start=$1
    local end=$2
    for port in $(seq $start $end); do
        # Check if port is in use (lsof returns 0 if port is in use)
        if ! lsof -i :$port -sTCP:LISTEN > /dev/null 2>&1; then
            echo $port
            return 0
        fi
    done
    return 1
}

# Find available ports dynamically
# Flask: try 5002-5099 (avoids production range starting at 5001)
# Vite: try 5174-5199 (avoids production at 5173)
echo -e "${YELLOW}Finding available ports...${NC}"

FLASK_PORT=$(find_available_port 5002 5099)
if [ -z "$FLASK_PORT" ]; then
    echo -e "${RED}Error: Could not find available port for Flask (tried 5002-5099)${NC}"
    exit 1
fi

VITE_PORT=$(find_available_port 5174 5199)
if [ -z "$VITE_PORT" ]; then
    echo -e "${RED}Error: Could not find available port for Vite (tried 5174-5199)${NC}"
    exit 1
fi

echo -e "${GREEN}Selected ports: Flask=$FLASK_PORT, Vite=$VITE_PORT${NC}"

# Export env vars for Electron
export DEV_FLASK_PORT=$FLASK_PORT
export DEV_VITE_PORT=$VITE_PORT
export ECLOSION_DEV_MODE=1  # Skip singleton lock for hot reload

echo -e "${YELLOW}Eclosion Dev Mode${NC}"
echo "=================="

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    pkill -f "python.*api.py.*PORT=$FLASK_PORT" 2>/dev/null || true
    pkill -f "vite.*--port.*$VITE_PORT" 2>/dev/null || true
    pkill -f "Electron.*ynab-scripts\|electronmon" 2>/dev/null || true
    rm -f "$STATE_DIR/SingletonLock" 2>/dev/null || true
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Kill existing dev processes (only dev ports, not production)
echo -e "${YELLOW}Cleaning up existing dev processes...${NC}"
pkill -9 -f "Electron.*ynab-scripts" 2>/dev/null || true
pkill -9 -f "electronmon" 2>/dev/null || true
pkill -f "python.*api.py.*PORT=$FLASK_PORT" 2>/dev/null || true
pkill -f "vite.*--port.*$VITE_PORT" 2>/dev/null || true
rm -f "$STATE_DIR/SingletonLock" 2>/dev/null || true
sleep 1

# Start Flask backend
echo -e "${YELLOW}Starting Flask backend on port $FLASK_PORT...${NC}"
cd "$PROJECT_ROOT"

# In dev mode, tunnel proxies to Vite for hot-reload
# FRONTEND_PATH is kept as fallback but DEV_VITE_URL takes priority
FRONTEND_DIST="$PROJECT_ROOT/frontend/dist"
if [ -d "$FRONTEND_DIST" ]; then
    FRONTEND_PATH="$FRONTEND_DIST"
else
    FRONTEND_PATH=""
fi
echo -e "${GREEN}Tunnel hot-reload enabled - proxying to Vite${NC}"

STATE_DIR="$STATE_DIR" FLASK_DEBUG=1 PORT=$FLASK_PORT ECLOSION_DESKTOP=1 FRONTEND_PATH="$FRONTEND_PATH" DEV_VITE_URL="http://localhost:$VITE_PORT" python api.py &
FLASK_PID=$!

# Wait for Flask to be ready
echo -n "Waiting for Flask"
until curl -s http://localhost:$FLASK_PORT/health > /dev/null 2>&1; do
    echo -n "."
    sleep 0.5
done
echo -e " ${GREEN}ready${NC}"

# Start Vite frontend
echo -e "${YELLOW}Starting Vite frontend on port $VITE_PORT...${NC}"
cd "$PROJECT_ROOT/frontend"
# Enable tunnel mode for HMR if remote access will be used
VITE_TUNNEL_MODE=true VITE_PORT=$VITE_PORT npm run dev -- --port $VITE_PORT &
VITE_PID=$!

# Wait for Vite to be ready
echo -n "Waiting for Vite"
until curl -s http://localhost:$VITE_PORT > /dev/null 2>&1; do
    echo -n "."
    sleep 0.5
done
echo -e " ${GREEN}ready${NC}"

# Start Electron
echo -e "${YELLOW}Starting Electron...${NC}"
cd "$PROJECT_ROOT/desktop"
npm run dev &
ELECTRON_PID=$!

echo ""
echo -e "${GREEN}All services running:${NC}"
echo "  - Flask backend:  http://localhost:$FLASK_PORT"
echo "  - Vite frontend:  http://localhost:$VITE_PORT"
echo "  - Electron:       running"
echo "  - State dir:      $STATE_DIR"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for any process to exit
wait
