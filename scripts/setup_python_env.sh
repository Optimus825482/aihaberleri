#!/bin/bash
# Setup Python environment for topic extraction script

echo "🚀 Setting up Python environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r scripts/requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate the virtual environment:"
echo "  source venv/bin/activate"
echo ""
echo "To run the script:"
echo "  python3 scripts/extract_topics_python.py"
echo "  python3 scripts/extract_topics_python.py --limit 100"
echo "  python3 scripts/extract_topics_python.py --all"
echo ""
