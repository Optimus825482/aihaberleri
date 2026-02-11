# Antigravity Kit → Kiro Skills Migration Script
# Converts .agent/ structure to .kiro/ with YAML frontmatter

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Antigravity Kit → Kiro Skills Migration" -ForegroundColor Cyan
Write-Host "=" * 60

# Configuration
$sourceRoot = ".agent"
$targetRoot = ".kiro"
$migrationLog = ".kiro/migration-log.txt"

# Statistics
$stats = @{
    Skills = 0
    Agents = 0
    Workflows = 0
    Errors = 0
}

# Initialize log
if (-not $DryRun) {
    "Migration started: $(Get-Date)" | Out-File $migrationLog
}

# Helper function to extract frontmatter
function Get-Frontmatter {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    if ($content -match '(?s)^---\s*\n(.*?)\n---') {
        return $matches[1]
    }
    return $null
}

# Helper function to parse YAML-like frontmatter
function Parse-Frontmatter {
    param([string]$Yaml)
    
    $result = @{}
    $lines = $Yaml -split "`n"
    
    foreach ($line in $lines) {
        if ($line -match '^\s*([^:]+):\s*(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $result[$key] = $value
        }
    }
    
    return $result
}

# Migrate Skills
Write-Host "`n📚 Migrating Skills..." -ForegroundColor Yellow

$skillDirs = Get-ChildItem "$sourceRoot/sk2" -Directory

foreach ($skillDir in $skillDirs) {
    $skillFile = Join-Path $skillDir.FullName "SKILL.md"
    
    if (Test-Path $skillFile) {
        try {
            $skillName = $skillDir.Name
            $targetFile = "$targetRoot/skills/$skillName.md"
            
            Write-Host "  Processing: $skillName" -ForegroundColor Gray
            
            # Read original content
            $content = Get-Content $skillFile -Raw
            
            # Extract existing frontmatter
            $frontmatter = Get-Frontmatter -FilePath $skillFile
            
            if ($frontmatter) {
                $fm = Parse-Frontmatter -Yaml $frontmatter
                
                # Create enhanced frontmatter
                $newFrontmatter = @"
---
name: "$($fm['name'])"
description: "$($fm['description'])"
keywords: []
category: "general"
relatedSkills: []
---
"@
                
                # Remove old frontmatter and add new one
                $bodyContent = $content -replace '(?s)^---\s*\n.*?\n---\s*\n', ''
                $newContent = $newFrontmatter + "`n`n" + $bodyContent
                
                if (-not $DryRun) {
                    $newContent | Out-File $targetFile -Encoding UTF8
                    "✅ Migrated: $skillName" | Add-Content $migrationLog
                }
                
                $stats.Skills++
                Write-Host "    ✅ Migrated" -ForegroundColor Green
            }
            else {
                Write-Host "    ⚠️  No frontmatter found" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "    ❌ Error: $_" -ForegroundColor Red
            $stats.Errors++
            "❌ Error migrating $skillName : $_" | Add-Content $migrationLog
        }
    }
}

# Migrate Agents
Write-Host "`n🤖 Migrating Agents..." -ForegroundColor Yellow

$agentFiles = Get-ChildItem "$sourceRoot/agents" -Filter "*.md"

foreach ($agentFile in $agentFiles) {
    try {
        $agentName = $agentFile.BaseName
        $targetFile = "$targetRoot/agents/$($agentFile.Name)"
        
        Write-Host "  Processing: $agentName" -ForegroundColor Gray
        
        # Read original content
        $content = Get-Content $agentFile.FullName -Raw
        
        # Extract existing frontmatter
        $frontmatter = Get-Frontmatter -FilePath $agentFile.FullName
        
        if ($frontmatter) {
            $fm = Parse-Frontmatter -Yaml $frontmatter
            
            # Create enhanced frontmatter
            $newFrontmatter = @"
---
name: "$($fm['name'])"
description: "$($fm['description'])"
keywords: []
skills: []
tools: []
model: "inherit"
---
"@
            
            # Remove old frontmatter and add new one
            $bodyContent = $content -replace '(?s)^---\s*\n.*?\n---\s*\n', ''
            $newContent = $newFrontmatter + "`n`n" + $bodyContent
            
            if (-not $DryRun) {
                $newContent | Out-File $targetFile -Encoding UTF8
                "✅ Migrated: $agentName" | Add-Content $migrationLog
            }
            
            $stats.Agents++
            Write-Host "    ✅ Migrated" -ForegroundColor Green
        }
        else {
            Write-Host "    ⚠️  No frontmatter found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "    ❌ Error: $_" -ForegroundColor Red
        $stats.Errors++
        "❌ Error migrating $agentName : $_" | Add-Content $migrationLog
    }
}

# Migrate Workflows
Write-Host "`n⚡ Migrating Workflows..." -ForegroundColor Yellow

$workflowFiles = Get-ChildItem "$sourceRoot/workflows" -Filter "*.md"

foreach ($workflowFile in $workflowFiles) {
    try {
        $workflowName = $workflowFile.BaseName
        $targetFile = "$targetRoot/workflows/$($workflowFile.Name)"
        
        Write-Host "  Processing: $workflowName" -ForegroundColor Gray
        
        # Read original content
        $content = Get-Content $workflowFile.FullName -Raw
        
        # Extract existing frontmatter
        $frontmatter = Get-Frontmatter -FilePath $workflowFile.FullName
        
        if ($frontmatter) {
            $fm = Parse-Frontmatter -Yaml $frontmatter
            
            # Create enhanced frontmatter
            $newFrontmatter = @"
---
name: "$workflowName"
description: "$($fm['description'])"
keywords: []
trigger: "/$workflowName"
---
"@
            
            # Remove old frontmatter and add new one
            $bodyContent = $content -replace '(?s)^---\s*\n.*?\n---\s*\n', ''
            $newContent = $newFrontmatter + "`n`n" + $bodyContent
            
            if (-not $DryRun) {
                $newContent | Out-File $targetFile -Encoding UTF8
                "✅ Migrated: $workflowName" | Add-Content $migrationLog
            }
            
            $stats.Workflows++
            Write-Host "    ✅ Migrated" -ForegroundColor Green
        }
        else {
            Write-Host "    ⚠️  No frontmatter found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "    ❌ Error: $_" -ForegroundColor Red
        $stats.Errors++
        "❌ Error migrating $workflowName : $_" | Add-Content $migrationLog
    }
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 Migration Summary" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "  Skills migrated:    $($stats.Skills)" -ForegroundColor Green
Write-Host "  Agents migrated:    $($stats.Agents)" -ForegroundColor Green
Write-Host "  Workflows migrated: $($stats.Workflows)" -ForegroundColor Green
Write-Host "  Errors:             $($stats.Errors)" -ForegroundColor $(if ($stats.Errors -gt 0) { "Red" } else { "Green" })

if ($DryRun) {
    Write-Host "`n⚠️  DRY RUN - No files were actually modified" -ForegroundColor Yellow
}
else {
    Write-Host "`n✅ Migration complete! Check $migrationLog for details." -ForegroundColor Green
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review migrated files in .kiro/" -ForegroundColor Gray
Write-Host "  2. Test skill loading with Kiro" -ForegroundColor Gray
Write-Host "  3. Update keywords and categories manually" -ForegroundColor Gray
Write-Host "  4. Backup .agent/ directory" -ForegroundColor Gray
