#!/bin/bash

# Global AI Agent System - Quick Setup (Unix/Mac)
# Run: bash setup-global.sh

echo ""
echo "=================================="
echo "  Antigravity Kit Global Setup"
echo "=================================="
echo ""

# Determine global path
GLOBAL_PATH="$HOME/.ai-agents"

echo "Target Location: $GLOBAL_PATH"
echo ""

# Check if already exists
if [ -d "$GLOBAL_PATH" ]; then
    echo "⚠️  Directory already exists!"
    read -p "Overwrite? (y/n): " response
    if [ "$response" != "y" ]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
    rm -rf "$GLOBAL_PATH"
fi

# Create directory
echo "📁 Creating global directory..."
mkdir -p "$GLOBAL_PATH"

# Determine source path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/.agent" ]; then
    SOURCE_PATH="$SCRIPT_DIR/.agent"
else
    SOURCE_PATH="$SCRIPT_DIR"
fi

# Copy contents
echo "📦 Copying Antigravity Kit files..."
cp -r "$SOURCE_PATH"/* "$GLOBAL_PATH/" 2>/dev/null || true
# Remove unwanted items
rm -rf "$GLOBAL_PATH/node_modules" "$GLOBAL_PATH/.git" 2>/dev/null

# Set environment variable in shell config
echo ""
echo "🔧 Setting environment variable..."

# Detect shell
if [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    SHELL_CONFIG="$HOME/.profile"
fi

# Add to shell config if not already there
if ! grep -q "AI_AGENTS_PATH" "$SHELL_CONFIG" 2>/dev/null; then
    echo "" >> "$SHELL_CONFIG"
    echo "# Antigravity Kit" >> "$SHELL_CONFIG"
    echo "export AI_AGENTS_PATH=\"$GLOBAL_PATH\"" >> "$SHELL_CONFIG"
    echo "✅ Added AI_AGENTS_PATH to $SHELL_CONFIG"
    echo "   Run: source $SHELL_CONFIG"
else
    echo "ℹ️  AI_AGENTS_PATH already in $SHELL_CONFIG"
fi

# Verify installation
echo ""
echo "🔍 Verifying installation..."
ALL_GOOD=true
for item in "ARCHITECTURE.md" "README.md" "agents" "skills" "workflows"; do
    if [ -e "$GLOBAL_PATH/$item" ]; then
        echo "  ✅ $item"
    else
        echo "  ❌ $item (missing)"
        ALL_GOOD=false
    fi
done

# Show summary
echo ""
echo "=================================="
if [ "$ALL_GOOD" = true ]; then
    echo "✅ SUCCESS!"
    echo ""
    echo "Antigravity Kit installed at:"
    echo "  $GLOBAL_PATH"
    echo ""
    echo "📚 Documentation:"
    echo "  $GLOBAL_PATH/ARCHITECTURE.md"
    echo ""
    echo "🎯 Next Steps:"
    echo "  1. Reload shell:"
    echo "     source $SHELL_CONFIG"
    echo ""
    echo "  2. In ANY project, add to .github/copilot-instructions.md:"
    echo "     Global AI Agents: $GLOBAL_PATH"
    echo ""
    echo "  3. Use validation:"
    echo "     python $GLOBAL_PATH/scripts/checklist.py ."
    echo ""
    echo "  4. AI auto-routing works immediately!"
    echo ""
    echo "🚀 No more copying .agent to every project!"
else
    echo "⚠️  Some files are missing. Check installation."
fi
echo "=================================="
echo ""
