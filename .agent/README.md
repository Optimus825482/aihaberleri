# 🌍 Antigravity Kit - Global AI Agent System

> **Centralized Multi-Project AI Capability Framework**
> 
> **ONE installation** → Use across **ALL projects** - No copying needed!

---

## 🚀 What Is This?

A **centralized, intelligent AI agent system** that lives in ONE place and works for ALL your projects. No copying, no duplication, just reference it globally.

### Key Features

✅ **20 Specialist Agents** - Frontend, Backend, Security, Testing, DevOps, etc.  
✅ **36 Reusable Skills** - React/Next.js, APIs, Databases, Mobile, Game Dev, etc.  
✅ **Intelligent Auto-Routing** - Automatically selects the right agent for your task  
✅ **Selective Loading** - Reads only relevant sections, not entire folders  
✅ **Validation Scripts** - Built-in quality, security, and performance checks  
✅ **Global Install** - ONE location, ALL projects benefit

---

## 📦 Quick Start

### Method 1: Automated Setup (Recommended)

#### Windows (PowerShell)

```powershell
# Run from .agent directory
.\setup-global.ps1

# Or from project root
.\.agent\setup-global.ps1
```

#### Linux/Mac (Bash)

```bash
# Make executable and run
chmod +x .agent/setup-global.sh
bash .agent/setup-global.sh
```

**That's it!** The script:
- ✅ Creates `~/.ai-agents` (or `%USERPROFILE%\.ai-agents`)
- ✅ Copies all agent/skill/workflow files
- ✅ Sets `AI_AGENTS_PATH` environment variable
- ✅ Verifies installation

---

### Method 2: Manual Installation

#### Step 1: Create Global Directory

```bash
# Windows
mkdir %USERPROFILE%\.ai-agents
cd %USERPROFILE%\.ai-agents

# Linux/Mac
mkdir -p ~/.ai-agents
cd ~/.ai-agents
```

#### Step 2: Copy Files

```bash
# Windows (from project root)
Copy-Item -Recurse .agent\* $env:USERPROFILE\.ai-agents\

# Linux/Mac
cp -r .agent/* ~/.ai-agents/
```

#### Step 3: Set Environment Variable

```bash
# Windows (PowerShell as Admin)
[System.Environment]::SetEnvironmentVariable('AI_AGENTS_PATH', "$env:USERPROFILE\.ai-agents", 'User')

# Linux/Mac (add to ~/.bashrc or ~/.zshrc)
echo 'export AI_AGENTS_PATH="$HOME/.ai-agents"' >> ~/.bashrc
source ~/.bashrc
```

---

## 📝 Using in Projects

- "Optimize this React component" → `@frontend-specialist` + `nextjs-react-expert`
- "Review security" → `@security-auditor` + `vulnerability-scanner`
- "Build an API" → `@backend-specialist` + `api-patterns`
- "Fix this bug" → `@debugger` + `systematic-debugging`

---

## 🤖 How It Works

### Intelligent Routing

```
Your Request
    ↓
Domain Detection (Frontend/Backend/Security/etc.)
    ↓
Agent Selection (e.g., frontend-specialist)
    ↓
Skill Loading (e.g., nextjs-react-expert)
    ↓
Response with Expertise
```

### Example

**You ask**: "My Next.js app is slow"

**System does** (automatically):
1. Detects domain: Performance + Frontend
2. Selects agents: `@performance-optimizer` + `@frontend-specialist`
3. Loads skills: `nextjs-react-expert` + `performance-profiling`
4. Announces: `🤖 Applying knowledge of @performance-optimizer...`
5. Delivers: Specific optimization recommendations

---

## 📚 Agent Catalog

| Agent | When to Use | Key Skills |
|-------|-------------|------------|
| `frontend-specialist` | React, Next.js, UI work | nextjs-react-expert, tailwind-patterns |
| `backend-specialist` | APIs, servers, business logic | api-patterns, nodejs-best-practices |
| `database-architect` | Schema design, queries | database-design, prisma-expert |
| `mobile-developer` | iOS, Android, React Native | mobile-design |
| `game-developer` | Game mechanics, physics | game-development |
| `devops-engineer` | Docker, CI/CD, deployment | deployment-procedures, docker-expert |
| `security-auditor` | Vulnerability scanning | vulnerability-scanner, red-team-tactics |
| `test-engineer` | Unit, E2E, integration tests | testing-patterns, webapp-testing |
| `debugger` | Root cause analysis | systematic-debugging |
| `performance-optimizer` | Core Web Vitals, speed | performance-profiling |
| `seo-specialist` | Search ranking, metadata | seo-fundamentals |
| `project-planner` | Task breakdown, planning | brainstorming, plan-writing |
| `orchestrator` | Complex multi-domain tasks | Coordinates 3+ agents |

**Full list**: See `.agent/ARCHITECTURE.md`

---

## 🔧 Validation Scripts

Run quality checks before deployment:

```bash
# Core validation (security, lint, tests)
python .agent/scripts/checklist.py .

# Comprehensive check (Lighthouse, E2E, mobile)
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

### What Gets Checked

✅ Security vulnerabilities  
✅ Code quality (lint, types)  
✅ Test coverage  
✅ Performance (Core Web Vitals)  
✅ SEO compliance  
✅ Accessibility  
✅ Mobile responsiveness  
✅ i18n completeness

---

## 🎯 Usage Examples

### Web Development

```
"Build a landing page"
→ @frontend-specialist
→ Uses: nextjs-react-expert, tailwind-patterns, frontend-design
```

### API Development

```
"Create a REST API for users"
→ @backend-specialist
→ Uses: api-patterns, nodejs-best-practices, database-design
```

### Security Review

```
"Check for vulnerabilities"
→ @security-auditor
→ Runs: vulnerability-scanner script
→ Checks: OWASP Top 10, secrets, dependencies
```

### Performance Optimization

```
"Why is my app slow?"
→ @performance-optimizer + @frontend-specialist
→ Analyzes: Bundle size, waterfalls, re-renders
→ Provides: Specific fixes with code examples
```

---

## 🌍 Cross-Project Compatibility

### Supported Project Types

| Type | Compatible? | Primary Agents |
|------|-------------|----------------|
| **Web Apps** (React, Next.js, Vue) | ✅ | frontend-specialist, backend-specialist |
| **Mobile** (React Native, iOS, Android) | ✅ | mobile-developer |
| **Backend APIs** (Node.js, Python, FastAPI) | ✅ | backend-specialist, database-architect |
| **Game Dev** (Unity, Unreal, Godot) | ✅ | game-developer |
| **DevOps** (Docker, K8s, CI/CD) | ✅ | devops-engineer |

### Language Support

✅ JavaScript/TypeScript  
✅ Python  
✅ SQL  
✅ Bash/Shell  
✅ PowerShell  
✅ CSS/Tailwind

---

## 📖 Documentation

- **Full Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Agent Details**: [agents/](agents/) folder
- **Skill Catalogs**: [skills/](skills/) folder (each has SKILL.md)
- **Workflow Guides**: [workflows/](workflows/) folder
- **Global Rules**: [rules/GEMINI.md](rules/GEMINI.md)
- **Scripts**: [scripts/](scripts/) folder

---

## 🎓 Best Practices

### For Users

1. **Be specific** - Clear requests get better agent selection
2. **Trust auto-routing** - System knows which agent to use
3. **Use workflows** - Try `/orchestrate`, `/plan`, `/debug`
4. **Validate often** - Run scripts before deployment

### For AI (Using This System)

1. **Always announce** expertise: `🤖 Applying knowledge of @[agent-name]...`
2. **Read indexes first**: Load `SKILL.md`, check content map
3. **Selective loading**: Read only relevant sections
4. **Follow priorities**: GEMINI.md > Agent .md > SKILL.md
5. **Orchestrate complexity**: 3+ domains = use `orchestrator`

---

## 🔄 Workflow Commands

Invoke structured workflows with `/command`:

| Command | Purpose |
|---------|---------|
| `/orchestrate` | Multi-agent coordination for complex tasks |
| `/plan` | Break down tasks before implementation |
| `/create` | Build new features |
| `/enhance` | Optimize existing code |
| `/debug` | Investigate and fix bugs |
| `/test` | Run test suites |
| `/deploy` | Deploy to production |
| `/ui-ux-pro-max` | Design with 50 style options |

---

## 📊 System Stats

- **20 Agents** - Cover all major domains
- **36 Skills** - Modular, reusable knowledge
- **11 Workflows** - Structured execution patterns
- **20+ Scripts** - Automated validation
- **~90% Coverage** - Web, mobile, backend, game dev

---

## 🤝 Contributing

Want to add an agent or skill?

1. Follow modular structure (agents/, skills/, workflows/)
2. Keep project-agnostic (no hardcoded paths)
3. Add content maps and decision trees
4. Include automation scripts
5. Test across multiple projects
6. Document with examples

**Goal**: Every component should work in **ANY** project.

---

## ⚡ Why Use This?

**Before Antigravity Kit**:
- Generic AI responses
- No domain expertise
- Manual skill lookup
- Inconsistent quality
- No validation

**After Antigravity Kit**:
- ✅ Specialist expertise for every domain
- ✅ Auto-detection and routing
- ✅ Selective, efficient knowledge loading
- ✅ Consistent, high-quality output
- ✅ Built-in validation scripts

---

## 📞 Support

- **Documentation**: See `.agent/ARCHITECTURE.md`
- **Examples**: Check `workflows/` folder
- **Troubleshooting**: Run `python .agent/scripts/checklist.py .`

---

**Made with ❤️ for global AI productivity**

Copy → Paste → Work on ANY project 🚀
