# Global AI Agent System - Quick Setup
# Run this once to install Antigravity Kit globally

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  Antigravity Kit Global Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Detect OS
$IsWindows = $PSVersionTable.Platform -eq 'Win32NT' -or [System.Environment]::OSVersion.Platform -eq 'Win32NT'

if ($IsWindows) {
    $GlobalPath = "$env:USERPROFILE\.ai-agents"
    $EnvVarTarget = "User"
} else {
    $GlobalPath = "$HOME/.ai-agents"
    $EnvVarTarget = "Process" # On Unix, we'll add to shell config instead
}

Write-Host "`nTarget Location: $GlobalPath" -ForegroundColor Yellow

# Check if already exists
if (Test-Path $GlobalPath) {
    Write-Host "`n⚠️  Directory already exists!" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne 'y') {
        Write-Host "❌ Setup cancelled." -ForegroundColor Red
        exit
    }
    Remove-Item -Recurse -Force $GlobalPath
}

# Create directory
Write-Host "`n📁 Creating global directory..." -ForegroundColor Green
New-Item -ItemType Directory -Path $GlobalPath -Force | Out-Null

# Check if .agent exists in current directory
$CurrentAgentPath = Join-Path $PSScriptRoot ".agent"
if (-not (Test-Path $CurrentAgentPath)) {
    # We're probably IN the .agent folder already
    $CurrentAgentPath = $PSScriptRoot
}

# Copy contents
Write-Host "📦 Copying Antigravity Kit files..." -ForegroundColor Green
$items = Get-ChildItem -Path $CurrentAgentPath -Exclude "node_modules",".git"
foreach ($item in $items) {
    Copy-Item -Path $item.FullName -Destination $GlobalPath -Recurse -Force
}

# Set environment variable
Write-Host "`n🔧 Setting environment variable..." -ForegroundColor Green
if ($IsWindows) {
    [System.Environment]::SetEnvironmentVariable('AI_AGENTS_PATH', $GlobalPath, $EnvVarTarget)
    Write-Host "✅ Set AI_AGENTS_PATH=$GlobalPath (User level)" -ForegroundColor Green
} else {
    # On Unix, add to shell config
    $shellConfig = "$HOME/.bashrc"
    if (Test-Path "$HOME/.zshrc") {
        $shellConfig = "$HOME/.zshrc"
    }
    
    $exportLine = "export AI_AGENTS_PATH=`"$GlobalPath`""
    if (-not (Select-String -Path $shellConfig -Pattern "AI_AGENTS_PATH" -Quiet)) {
        Add-Content -Path $shellConfig -Value "`n# Antigravity Kit`n$exportLine"
        Write-Host "✅ Added AI_AGENTS_PATH to $shellConfig" -ForegroundColor Green
        Write-Host "   Run: source $shellConfig" -ForegroundColor Yellow
    }
}

# Verify installation
Write-Host "`n🔍 Verifying installation..." -ForegroundColor Green
$testFiles = @("ARCHITECTURE.md", "README.md", "agents", "skills", "workflows")
$allGood = $true
foreach ($file in $testFiles) {
    $fullPath = Join-Path $GlobalPath $file
    if (Test-Path $fullPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file (missing)" -ForegroundColor Red
        $allGood = $false
    }
}

# Show summary
Write-Host "`n==================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "`nAntigravity Kit installed at:" -ForegroundColor Cyan
    Write-Host "  $GlobalPath" -ForegroundColor Yellow
    
    Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
    Write-Host "  $GlobalPath\ARCHITECTURE.md" -ForegroundColor Yellow
    
    Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. In ANY project, add to .github/copilot-instructions.md:" -ForegroundColor White
    Write-Host "     Global AI Agents: $GlobalPath" -ForegroundColor Yellow
    Write-Host "  2. Use validation:" -ForegroundColor White
    Write-Host "     python $GlobalPath\scripts\checklist.py ." -ForegroundColor Yellow
    Write-Host "  3. AI auto-routing works immediately!" -ForegroundColor White
    
    Write-Host "`n🚀 No more copying .agent to every project!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some files are missing. Check installation." -ForegroundColor Yellow
}
Write-Host "==================================" -ForegroundColor Cyan
