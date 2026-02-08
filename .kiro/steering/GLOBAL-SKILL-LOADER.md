---
inclusion: always
---

# Global Skill Loader

## Purpose

Automatically load relevant skills from `C:\Users\erkan\.agent2\skills` based on keyword detection in user requests. This system provides access to 500+ specialized skills covering all aspects of software development.

## Core Principles

**Automatic Activation**: Every user request triggers keyword analysis and skill loading before task execution.

**Real Execution**: Always use actual tool calls (`executePwsh`) to load skills - never simulate.

**Silent Operation**: Skill loading happens in the background without notifying the user.

**Communication Language**: User-facing content (responses, documentation) in Turkish; code and technical identifiers in English.

## Activation Protocol

1. **Analyze Request**: Extract keywords from user input (case-insensitive)
2. **Match Skills**: Map keywords to relevant skills using the mapping tables below (minimum 3-5 skills)
3. **Load Skills**: Execute `Get-Content` via `executePwsh` for each matched skill
4. **Apply Knowledge**: Use loaded skill content to inform task execution

## Skill Loading Command

```powershell
Get-Content "C:\Users\erkan\.agent2\skills\{skill-name}\SKILL.md"
```

Use `executePwsh` tool with this command for each detected skill.

## Keyword to Skill Mapping

### AI & Agent Development

| Keywords                                                     | Global Skills (.agent2/skills)                                                                                                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "agent", "multi-agent", "orchestration", "subagent", "spawn" | agent-orchestration-multi-agent-optimize, agent-orchestration-improve-agent, autonomous-agent-patterns, dispatching-parallel-agents, subagent-driven-development, agent-manager-skill, multi-agent-patterns, multi-agent-brainstorming |
| "AI", "LLM", "prompt", "model"                               | ai-engineer, ai-product, llm-app-patterns, prompt-engineering, prompt-engineering-patterns, llm-evaluation, prompt-engineer, prompt-library, prompt-caching, ai-wrapper-product                                                        |
| "RAG", "embedding", "vector", "search"                       | rag-engineer, rag-implementation, embedding-strategies, vector-database-engineer, vector-index-tuning, hybrid-search-implementation, similarity-search-patterns, search-specialist                                                     |
| "memory", "context", "state"                                 | agent-memory-systems, agent-memory-mcp, context-management-context-restore, context-optimization, memory-systems, context-manager, context-window-management, conversation-memory, context-fundamentals                                |
| "evaluation", "agentic"                                      | agent-evaluation, agentic-eval, evaluation, llm-evaluation                                                                                                                                                                             |

### 🐛 Debugging & Testing

| Keywords                                     | Global Skills (.agent2/skills)                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "debug", "hata", "fix", "error", "bug"       | systematic-debugging, debugger, error-detective, debugging-strategies, debugging-toolkit-smart-debug, error-debugging-error-analysis, error-debugging-error-trace, error-diagnostics-error-analysis, distributed-debugging-debug-trace, find-bugs |
| "test", "TDD", "testing", "unit test"        | test-driven-development, tdd-workflow, testing-patterns, test-automator, unit-testing-test-generate, tdd-orchestrator, tdd-workflows-tdd-cycle, test-fixing, javascript-testing-patterns, python-testing-patterns                                 |
| "E2E", "integration", "playwright"           | e2e-testing-patterns, playwright-skill, webapp-testing, browser-automation                                                                                                                                                                        |
| "performance test", "load test", "benchmark" | performance-testing-review-ai-review, performance-profiling, performance-engineer, application-performance-performance-optimization                                                                                                               |

### 🏗️ Architecture & Design

| Keywords                                            | Global Skills (.agent2/skills)                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "architecture", "mimari", "design", "system design" | architecture, architecture-patterns, software-architecture, senior-architect, architect-review, architecture-decision-records, c4-architecture-c4-architecture, c4-context, c4-container, c4-component, c4-code |
| "microservices", "distributed", "service mesh"      | microservices-patterns, service-mesh-expert, service-mesh-observability, istio-traffic-management, linkerd-patterns                                                                                             |
| "event sourcing", "CQRS", "saga"                    | event-sourcing-architect, event-store-design, cqrs-implementation, saga-orchestration, projection-patterns                                                                                                      |
| "monorepo", "workspace"                             | monorepo-architect, monorepo-management, nx-workspace-patterns, turborepo-caching                                                                                                                               |

### 💻 Backend Development

| Keywords                                  | Global Skills (.agent2/skills)                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "API", "backend", "server", "endpoint"    | api-patterns, api-design-principles, backend-architect, backend-dev-guidelines, backend-development-feature-development, nodejs-backend-patterns, cc-skill-backend-patterns, api-security-best-practices |
| "Node.js", "Express", "NestJS"            | nodejs-best-practices, nestjs-expert, fastapi-pro                                                                                                                                                        |
| "database", "SQL", "PostgreSQL", "Prisma" | database-design, database-architect, database-optimizer, postgres-best-practices, postgresql, prisma-expert, sql-optimization-patterns, sql-pro, nosql-expert                                            |
| "GraphQL", "REST"                         | graphql, graphql-architect, api-patterns                                                                                                                                                                 |
| "authentication", "auth", "JWT"           | auth-implementation-patterns, clerk-auth, nextjs-supabase-auth                                                                                                                                           |

### 🎨 Frontend Development

| Keywords                                    | Global Skills (.agent2/skills)                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "React", "component", "hooks", "state"      | react-best-practices, react-patterns, react-state-management, react-ui-patterns, react-modernization, vercel-react-best-practices, fp-ts-react         |
| "Next.js", "app router", "SSR"              | nextjs-react-expert, nextjs-best-practices, nextjs-app-router-patterns, nextjs-supabase-auth                                                           |
| "UI", "frontend", "arayüz", "design system" | frontend-design, frontend-developer, frontend-dev-guidelines, ui-ux-designer, ui-ux-pro-max, ui-skills, radix-ui-design-system, tailwind-design-system |
| "Tailwind", "CSS", "styling"                | tailwind-patterns, tailwind-design-system, stitch-ui-design                                                                                            |
| "mobile", "React Native", "Expo"            | mobile-design, mobile-developer, react-native-architecture, vercel-react-native-skills, expo-deployment, upgrading-expo                                |
| "animation", "3D", "canvas"                 | threejs-skills, 3d-web-experience, canvas-design, scroll-experience                                                                                    |

### 🔒 Security & Penetration Testing

| Keywords                                           | Global Skills (.agent2/skills)                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| "security", "güvenlik", "vulnerability", "pentest" | security-auditor, vulnerability-scanner, red-team-tactics, red-team-tools, pentest-checklist, pentest-commands, ethical-hacking-methodology |
| "XSS", "injection", "IDOR"                         | xss-html-injection, sql-injection-testing, idor-testing, html-injection-testing, file-path-traversal                                        |
| "authentication bypass", "broken auth"             | broken-authentication, privilege-escalation-methods, linux-privilege-escalation, windows-privilege-escalation                               |
| "API security", "fuzzing"                          | api-security-best-practices, api-fuzzing-bug-bounty, burp-suite-testing                                                                     |
| "malware", "reverse engineering"                   | malware-analyst, reverse-engineer, protocol-reverse-engineering, binary-analysis-patterns, firmware-analyst                                 |
| "network", "penetration"                           | network-engineer, network-101, aws-penetration-testing, cloud-penetration-testing, smtp-penetration-testing, ssh-penetration-testing        |

### ☁️ Cloud & DevOps

| Keywords                                   | Global Skills (.agent2/skills)                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "AWS", "cloud", "serverless"               | aws-skills, aws-serverless, cloud-architect, multi-cloud-architecture, hybrid-cloud-architect                                                                             |
| "Azure", "Azure Functions"                 | azure-deployment-preflight, azure-devops-cli, azure-functions, azure-static-web-apps, azure-resource-visualizer                                                           |
| "GCP", "Cloud Run"                         | gcp-cloud-run                                                                                                                                                             |
| "Docker", "container", "Kubernetes", "K8s" | docker-expert, kubernetes-architect, k8s-manifest-generator, k8s-security-policies, helm-chart-scaffolding                                                                |
| "CI/CD", "pipeline", "deployment"          | cicd-automation-workflow-automate, deployment-procedures, deployment-engineer, deployment-pipeline-design, github-actions-templates, gitlab-ci-patterns, azure-devops-cli |
| "Terraform", "IaC"                         | terraform-skill, terraform-specialist, terraform-module-library                                                                                                           |
| "monitoring", "observability", "logging"   | observability-engineer, observability-monitoring-monitor-setup, distributed-tracing, prometheus-configuration, grafana-dashboards, loki-mode                              |

### 📊 Data & Analytics

| Keywords                          | Global Skills (.agent2/skills)                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "data", "analytics", "pipeline"   | data-engineer, data-engineering-data-pipeline, data-engineering-data-driven-feature, analytics-tracking |
| "ML", "machine learning", "MLOps" | ml-engineer, ml-pipeline-workflow, mlops-engineer, machine-learning-ops-ml-pipeline                     |
| "data quality", "ETL", "dbt"      | data-quality-frameworks, dbt-transformation-patterns                                                    |
| "Snowflake", "data warehouse"     | snowflake-semanticview                                                                                  |
| "Spark", "big data"               | spark-optimization, airflow-dag-patterns                                                                |

### 🎮 Game Development

| Keywords                          | Global Skills (.agent2/skills)                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| "game", "oyun", "Unity", "Unreal" | game-development, unity-developer, unity-ecs-patterns, unreal-engine-cpp-pro, godot-gdscript-patterns, minecraft-bukkit-pro |

### 📱 Mobile & Cross-Platform

| Keywords                           | Global Skills (.agent2/skills)      |
| ---------------------------------- | ----------------------------------- |
| "iOS", "Swift", "SwiftUI"          | ios-developer, swiftui-expert-skill |
| "Flutter", "Dart"                  | flutter-expert                      |
| "multi-platform", "cross-platform" | multi-platform-apps-multi-platform  |

### 🔧 Programming Languages

| Keywords                               | Global Skills (.agent2/skills)                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "JavaScript", "JS", "TypeScript", "TS" | javascript-pro, javascript-mastery, javascript-testing-patterns, typescript-pro, typescript-expert, typescript-advanced-types, modern-javascript-patterns          |
| "Python", "async Python"               | python-pro, python-patterns, python-development-python-scaffold, python-testing-patterns, python-performance-optimization, async-python-patterns, python-packaging |
| "Go", "Golang"                         | golang-pro, go-concurrency-patterns                                                                                                                                |
| "Rust", "systems programming"          | rust-pro, rust-async-patterns, systems-programming-rust-project, memory-safety-patterns                                                                            |
| "C#", ".NET", "C++"                    | csharp-pro, dotnet-architect, dotnet-backend-patterns, cpp-pro, c-pro                                                                                              |
| "Java", "Scala", "Elixir"              | java-pro, scala-pro, elixir-pro                                                                                                                                    |
| "Ruby", "PHP", "Haskell"               | ruby-pro, php-pro, haskell-pro                                                                                                                                     |

### 🛠️ Tools & Frameworks

| Keywords                                   | Global Skills (.agent2/skills)                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Git", "GitHub", "version control"         | git-advanced-workflows, git-commit, git-pr-workflows-git-workflow, github-actions-templates, github-issues, github-workflow-automation, using-git-worktrees |
| "VS Code", "editor", "extension"           | vscode-ext-commands, vscode-ext-localization                                                                                                                |
| "Slack", "Discord", "Telegram", "WhatsApp" | slack-bot-builder, discord-bot-architect, telegram-bot-builder, telegram-mini-app, automate-whatsapp, observe-whatsapp                                      |
| "n8n", "workflow automation", "Zapier"     | n8n-code-python, n8n-mcp-tools-expert, n8n-node-configuration, workflow-automation, zapier-make-patterns                                                    |
| "Stripe", "payment", "PayPal", "Plaid"     | stripe-integration, payment-integration, paypal-integration, plaid-fintech                                                                                  |

### 📝 Documentation & Content

| Keywords                            | Global Skills (.agent2/skills)                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| "documentation", "docs", "README"   | documentation-templates, documentation-generation-doc-generate, docs-architect, readme, api-documentation-generator, api-documenter                   |
| "content", "writing", "copywriting" | content-creator, content-marketer, copywriting, copy-editing, writing-skills, beautiful-prose                                                         |
| "SEO", "search optimization"        | seo-fundamentals, seo-audit, seo-content-writer, seo-keyword-strategist, seo-meta-optimizer, seo-structure-architect, programmatic-seo, schema-markup |
| "blog", "article", "social media"   | seo-content-planner, seo-content-refresher, social-content, x-article-publisher-skill                                                                 |

### 🎯 Product & Business

| Keywords                           | Global Skills (.agent2/skills)                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| "product", "PRD", "roadmap"        | product-manager-toolkit, prd, ai-product, startup-analyst                                                                              |
| "business", "startup", "financial" | business-analyst, startup-business-analyst-business-case, startup-financial-modeling, startup-metrics-framework, financial-projections |
| "marketing", "ads", "campaign"     | marketing-ideas, marketing-psychology, paid-ads, email-sequence, referral-program                                                      |
| "CRO", "conversion", "A/B test"    | form-cro, page-cro, onboarding-cro, signup-flow-cro, ab-test-setup                                                                     |
| "pricing", "monetization"          | pricing-strategy, app-store-optimization                                                                                               |

### 🔄 Code Quality & Refactoring

| Keywords                              | Global Skills (.agent2/skills)                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "refactor", "clean code", "tech debt" | refactor, clean-code, code-refactoring-refactor-clean, code-refactoring-tech-debt, codebase-cleanup-tech-debt, legacy-modernizer                          |
| "code review", "PR", "review"         | code-review-excellence, code-reviewer, code-review-checklist, comprehensive-review-full-review, fix-review, receiving-code-review, requesting-code-review |
| "lint", "format", "validate"          | lint-and-validate, shellcheck-configuration, sast-configuration                                                                                           |
| "migration", "upgrade", "modernize"   | framework-migration-code-migrate, framework-migration-legacy-modernize, dependency-upgrade, angular-migration, react-modernization                        |

### 📦 Package Management & Dependencies

| Keywords                               | Global Skills (.agent2/skills)                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| "dependency", "package", "npm", "yarn" | dependency-management-deps-audit, codebase-cleanup-deps-audit, dependency-upgrade, nuget-manager, uv-package-manager |

### 🎨 Design & UI/UX

| Keywords                             | Global Skills (.agent2/skills)                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| "design", "UI/UX", "user experience" | ui-ux-designer, ui-ux-pro-max, web-design-guidelines, web-design-reviewer, design-md, design-orchestration |
| "accessibility", "a11y", "WCAG"      | accessibility-compliance-accessibility-audit, wcag-audit-patterns, screen-reader-testing                   |
| "Figma", "prototype", "mockup"       | canvas-design, legacy-circuit-mockups                                                                      |

### 🔐 Compliance & Legal

| Keywords                          | Global Skills (.agent2/skills)                                           |
| --------------------------------- | ------------------------------------------------------------------------ |
| "GDPR", "compliance", "PCI"       | gdpr-data-handling, pci-compliance, security-compliance-compliance-check |
| "legal", "contract", "employment" | legal-advisor, employment-contract-templates                             |

### 🎬 Media & Creative

| Keywords                           | Global Skills (.agent2/skills)                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| "image", "video", "audio", "media" | fal-image-edit, fal-upscale, imagen, image-manipulation-image-magick, fal-audio, fal-generate |
| "presentation", "slides", "PPT"    | pptx, pptx-official, frontend-slides, nanobanana-ppt-skills                                   |
| "PDF", "document", "DOCX", "XLSX"  | pdf, pdf-official, docx, docx-official, xlsx, xlsx-official                                   |

### 🌐 Web Technologies

| Keywords                      | Global Skills (.agent2/skills)                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| "web", "browser", "extension" | web-artifacts-builder, browser-extension-builder, web-performance-optimization                    |
| "Angular", "Vue"              | angular, angular-best-practices, angular-migration, angular-state-management, angular-ui-patterns |
| "Django", "FastAPI", "Flask"  | django-pro, fastapi-pro, fastapi-templates                                                        |

### 🔬 Research & Analysis

| Keywords                             | Global Skills (.agent2/skills)                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| "research", "analysis", "deep dive"  | deep-research, research-engineer, context7-auto-research, competitive-landscape, competitor-alternatives |
| "data science", "quant", "algorithm" | data-scientist, quant-analyst, algorithmic-art                                                           |

### 🎓 Learning & Onboarding

| Keywords                          | Global Skills (.agent2/skills)                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "tutorial", "guide", "onboarding" | tutorial-engineer, git-pr-workflows-onboard, environment-setup-guide                                 |
| "skill", "learning", "training"   | skill-creator, skill-developer, make-skill-template, using-superpowers, cc-skill-continuous-learning |

### 🔄 Workflow & Automation

| Keywords                                  | Global Skills (.agent2/skills)                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| "workflow", "automation", "orchestration" | workflow-automation, workflow-orchestration-patterns, workflow-patterns, full-stack-orchestration-full-stack-feature              |
| "incident", "on-call", "postmortem"       | incident-responder, incident-response-incident-response, on-call-handoff-patterns, postmortem-writing, incident-runbook-templates |

### 🎯 Specialized Domains

| Keywords                            | Global Skills (.agent2/skills)                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| "blockchain", "Web3", "DeFi", "NFT" | blockchain-developer, web3-testing, defi-protocol-templates, nft-standards, solidity-security |
| "voice", "audio", "TTS"             | voice-agents, voice-ai-development, voice-ai-engine-development                               |
| "Shopify", "e-commerce"             | shopify-development, shopify-apps                                                             |
| "WordPress", "CMS"                  | wordpress-penetration-testing, moodle-external-api-development                                |
| "Salesforce", "CRM"                 | salesforce-development, hubspot-integration, segment-cdp                                      |
| "HR", "recruitment", "culture"      | hr-pro, culture-index, team-composition-analysis                                              |

## Usage Examples

### Example 1: Debug Request

User: "Login API'de bug var, düzelt"

Detected keywords: "bug", "API", "düzelt"

Skills to load:

- systematic-debugging
- debugger
- error-detective
- api-patterns
- api-security-best-practices
- backend-architect
- test-driven-development

### Example 2: Frontend Performance

User: "React component'te performance sorunu var"

Detected keywords: "React", "component", "performance"

Skills to load:

- react-best-practices
- react-patterns
- vercel-react-best-practices
- performance-profiling
- performance-engineer
- systematic-debugging

### Example 3: Security Audit

User: "API güvenlik kontrolü yap"

Detected keywords: "API", "güvenlik", "kontrol"

Skills to load:

- security-auditor
- vulnerability-scanner
- api-security-best-practices
- pentest-checklist
- red-team-tactics
- api-fuzzing-bug-bounty

## Implementation Requirements

**Before Task Execution**:

1. Analyze user request for keywords
2. Match minimum 3-5 relevant skills
3. Load each skill using `executePwsh` with `Get-Content` command
4. Apply skill knowledge to task execution

**Mandatory Actions**:

- Use real tool calls (never simulate)
- Load skills silently (no user notification)
- Apply loaded content to inform responses
- Deduplicate skill list before loading

**Forbidden Actions**:

- Starting tasks without loading relevant skills
- Simulating skill loading without actual tool calls
- Notifying users about skill loading operations
