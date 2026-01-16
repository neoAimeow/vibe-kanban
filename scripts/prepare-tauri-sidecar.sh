#!/bin/bash
set -e

# Build the server binary
echo "Building server binary..."
# We use --release because sidecar is usually for release build. 
# For dev, we don't strictly need sidecar if we run backend manually, 
# but tauri conf expects externalBin to exist for bundling.
cargo build --release -p server

# Get the target triple
TRIPLE=$(rustc -vV | grep host | cut -d: -f2 | tr -d ' ')
echo "Detected target triple: $TRIPLE"

# Create binaries directory
mkdir -p src-tauri/binaries

# Move the binary
BINARY_NAME="server"
TARGET_NAME="server-${TRIPLE}"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  BINARY_NAME="server.exe"
  TARGET_NAME="${TARGET_NAME}.exe"
fi

# Check if source exists
if [ ! -f "target/release/$BINARY_NAME" ]; then
    echo "Error: Server binary not found at target/release/$BINARY_NAME"
    exit 1
fi

cp "target/release/$BINARY_NAME" "src-tauri/binaries/$TARGET_NAME"

echo "Server binary prepared at src-tauri/binaries/$TARGET_NAME"
