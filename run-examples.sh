#!/bin/bash

# igv.js Examples Runner Script
# This script builds igv.js and starts a local HTTP server to run the examples

set -e  # Exit on any error

echo "🚀 Starting igv.js Examples Setup..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the igv.js root directory"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building igv.js..."
npm run build

echo "✅ Build completed successfully!"
echo ""
echo "🌐 Starting HTTP server..."
echo "📂 Examples will be available at: http://localhost:8080/examples/"
echo "🎯 Quick start example: http://localhost:8080/examples/quick-start.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the HTTP server
npx http-server
