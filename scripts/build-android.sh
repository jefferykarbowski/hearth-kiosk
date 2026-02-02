#!/bin/bash
# Build Hearth UI for Android embedding
# Outputs a production bundle to be included in the APK assets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/../kitchen-kiosk-os/android/app/src/main/assets"

echo "=== Building Hearth UI for Android ==="

cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build production bundle
echo "Building production bundle..."
npm run build

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Copy build to Android assets
echo "Copying to Android assets..."
rm -rf "$OUTPUT_DIR/web"
cp -r dist "$OUTPUT_DIR/web"

# Create index redirect
cat > "$OUTPUT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0;url=web/index.html">
</head>
<body>
    <script>window.location.href = 'web/index.html';</script>
</body>
</html>
EOF

echo ""
echo "=== Build complete ==="
echo "Output: $OUTPUT_DIR"
echo ""
echo "The UI is now embedded in the Android app assets."
echo "Build the APK with: cd ../kitchen-kiosk-os/android && ./gradlew assembleRelease"
