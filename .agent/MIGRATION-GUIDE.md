# 🔄 Migration Guide: Local → Global Installation

> Shift from copying `.agent` to every project → ONE global installation

---

## 🎯 Why Migrate?

### Before (❌ Problem)
```
project-a/
  └─ .agent/  (50MB, v1.0)
project-b/
  └─ .agent/  (50MB, v1.2)  ← Out of sync!
project-c/
  └─ .agent/  (50MB, v1.1)  ← Different version!
```

**Issues**:
- ❌ Disk waste (150MB+ for 3 projects)
- ❌ Version inconsistencies
- ❌ Update nightmare (change 3 places)
- ❌ Hard to maintain

### After (✅ Solution)
```
~/.ai-agents/  (50MB, v1.2) ← ONE SOURCE OF TRUTH
     ↓
     ├→ project-a/ (5-line reference)
     ├→ project-b/ (5-line reference)
     └→ project-c/ (5-line reference)
```

**Benefits**:
- ✅ 50MB total (vs 150MB)
- ✅ Always in sync
- ✅ Update once, all projects benefit
- ✅ Easy maintenance

---

## 🚀 Quick Migration (3 Steps)

### Step 1: Run Setup Script

```bash
# Windows
.\setup-global.ps1

# Linux/Mac
bash setup-global.sh
```

### Step 2: Update Project References

In **EACH** project's `.github/copilot-instructions.md`, replace local references with:

```markdown
# AI Agent System

**Global Installation**: 
- Windows: `%USERPROFILE%\.ai-agents`
- Linux/Mac: `~/.ai-agents`

**Documentation**: `$AI_AGENTS_PATH/ARCHITECTURE.md`

**Auto-Routing**: Enabled - AI selects agents/skills automatically

**Quick Reference**:
- Frontend → @frontend-specialist
- Backend → @backend-specialist
- Security → @security-auditor
- Multi-domain → @orchestrator

**Validation**: 
```bash
python $AI_AGENTS_PATH/scripts/checklist.py .
```
```

### Step 3: Remove Local Copies (Optional)

```bash
# After verifying global install works
rm -rf .agent/  # Unix/Mac
Remove-Item -Recurse .agent/  # Windows
```

**Done!** ✅

---

## 📋 Detailed Migration Checklist

### Pre-Migration

- [ ] Backup current `.agent` folder (just in case)
- [ ] Document which projects use `.agent`
- [ ] Check if any project has custom modifications

### Migration Process

#### 1. Global Installation

```bash
# Run setup script
bash setup-global.sh  # Unix/Mac
.\setup-global.ps1     # Windows

# Verify
ls ~/.ai-agents/  # or %USERPROFILE%\.ai-agents\
```

Expected output:
```
ARCHITECTURE.md
README.md
agents/
skills/
workflows/
scripts/
rules/
```

#### 2. Update Each Project

For every project that had `.agent/`:

**Find and Replace** in `.github/copilot-instructions.md`:

```diff
- For agent documentation, see `.agent/ARCHITECTURE.md`
+ For agent documentation, see global `~/.ai-agents/ARCHITECTURE.md`

- python .agent/scripts/checklist.py .
+ python ~/.ai-agents/scripts/checklist.py .
```

**Or Replace Entire Section** with minimal reference (see Step 2 above).

#### 3. Test Before Cleanup

**Test in one project first**:

```bash
cd project-a

# Test validation
python ~/.ai-agents/scripts/checklist.py .  # Unix/Mac
python %USERPROFILE%\.ai-agents\scripts\checklist.py .  # Windows

# Test with AI
# Ask: "Optimize this React component"
# AI should announce: "🤖 Applying knowledge of @frontend-specialist..."
```

If works → Proceed to remove local copies.

#### 4. Remove Local Copies

```bash
# In each project root
rm -rf .agent/  # Unix/Mac
Remove-Item -Recurse .agent/  # Windows
```

#### 5. Commit Changes

```bash
git add .github/copilot-instructions.md
git commit -m "chore: migrate to global AI agent system"
git push
```

---

## 🔍 Verification

### Check Global Installation

```bash
# Should exist
test -d ~/.ai-agents && echo "✅ Exists" || echo "❌ Missing"

# Should have files
ls ~/.ai-agents/agents/ | wc -l  # Should show ~20
ls ~/.ai-agents/skills/ | wc -l  # Should show ~36
```

### Check Environment Variable

```bash
# Unix/Mac
echo $AI_AGENTS_PATH  # Should show ~/.ai-agents

# Windows
$env:AI_AGENTS_PATH  # Should show C:\Users\...\ai-agents
```

### Test AI Auto-Routing

Open any project and ask:

```
"Review security vulnerabilities in this project"
```

Expected behavior:
1. AI announces: `🤖 Applying knowledge of @security-auditor...`
2. AI loads `vulnerability-scanner` skill
3. AI provides specific security checks

---

## 🛠️ Troubleshooting

### Issue: AI can't find global path

**Solution**: Use absolute path in `.github/copilot-instructions.md`:

```markdown
# AI Agent System

**ABSOLUTE PATH**: 
- Windows: C:\Users\YourUsername\.ai-agents
- Unix: /home/username/.ai-agents

AI: Read ARCHITECTURE.md from above path for documentation.
```

### Issue: Scripts not executable

**Unix/Mac**:
```bash
chmod +x ~/.ai-agents/scripts/*.py
chmod +x ~/.ai-agents/scripts/*.sh
```

**Windows**: Run PowerShell as Administrator.

### Issue: Different versions across team

**Solution**: Use Git repo for global install:

```bash
cd ~/.ai-agents
git init
git remote add origin <your-repo-url>
git pull origin main

# Team members sync with:
cd ~/.ai-agents
git pull
```

---

## 📊 Disk Space Savings

| Projects | Before | After | Savings |
|----------|--------|-------|---------|
| 1 | 50MB | 50MB | 0% |
| 5 | 250MB | 50MB | 80% |
| 10 | 500MB | 50MB | 90% |
| 20 | 1GB | 50MB | 95% |

**Plus**: No version conflicts, easier updates!

---

## 🎓 Best Practices Post-Migration

1. **Keep global installation updated**:
   ```bash
   cd ~/.ai-agents
   git pull  # if using git
   ```

2. **Use environment variable in scripts**:
   ```bash
   python $AI_AGENTS_PATH/scripts/checklist.py .
   ```

3. **Document global path in team wiki**:
   - Location: `~/.ai-agents` or `%USERPROFILE%\.ai-agents`
   - Setup command: `bash setup-global.sh`
   - Documentation: `$AI_AGENTS_PATH/ARCHITECTURE.md`

4. **Onboarding new developers**:
   ```bash
   # One command to get started
   bash setup-global.sh
   ```

---

## 🚫 What NOT to Do

❌ Don't keep both local and global copies  
❌ Don't modify global installation per-project  
❌ Don't hardcode absolute paths (use `$AI_AGENTS_PATH`)  
❌ Don't forget to remove old local `.agent/` folders

---

## ✅ Success Criteria

You've successfully migrated when:

- [ ] Global installation exists at `~/.ai-agents`
- [ ] Environment variable `AI_AGENTS_PATH` is set
- [ ] All projects reference global path (not local)
- [ ] Local `.agent/` folders removed (or ignored)
- [ ] AI auto-routing works across all projects
- [ ] Validation scripts run from global path
- [ ] Team members can run `setup-global.sh` to sync

---

## 🎉 Result

**Before**: 10 projects × 50MB = 500MB, version chaos  
**After**: 1 installation × 50MB = 50MB, always in sync

**Migration time**: ~15 minutes for entire codebase  
**Disk savings**: 450MB+ (for 10 projects)  
**Maintenance**: Update once, all projects benefit

---

Need help? See `GLOBAL-SETUP-GUIDE.md` for detailed instructions.
