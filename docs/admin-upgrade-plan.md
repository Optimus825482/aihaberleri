# Implementation Plan: Admin Panel Upgrade & SEO Content Engine

This document outlines the roadmap for transforming the current News Agent (Kiro) dashboard into a "Command Center Pro" and enhancing the autonomous content generation with human-like qualities and technical SEO.

## Phase 1: Admin Dashboard Overhaul

**Goal:** Transition from a simple log-monitor to a data-driven command center.

- **Unified UI/UX:**
  - Implement a modern, responsive layout using **Tailwind CSS**.
  - Use **Server Components** for fast data fetching of article metrics.
- **Analytics Dashboard:**
  - **Category Charts (Heatmap/Pie):** Visual breakdown of news distribution (e.g., "AI: 40%, Crypto: 30%...").
  - **Engagement Stats:** Display "Most Viewed Articles" and "Total Reach."
  - **Real-time Status:** Enhanced log streaming with severity-based coloring (Info, Warning, Error).

## Phase 2: Content Management (CRUD)

**Goal:** Enable full editorial control over the autonomous agent's output.

- **Article Management Table:**
  - Search and filter articles by category, date, or status.
  - Columns: Image, Title, Category, Views, Status, Actions.
- **Full CRUD Support:**
  - **Edit:** Interactive Markdown/Rich Text editor for manual polishing.
  - **Delete:** Easy removal of outdated or low-quality articles with confirmation.
  - **Manual Trigger:** Capacity to re-run the "Humanizer" on specific articles.
- **Drafting Workflow:** Option to keep articles in "Draft" mode for manual approval before public listing.

## Phase 3: The "Ghostwriter" Engine (Human-Like AI)

**Goal:** Update the AI prompting strategy to bypass AI detection and increase engagement.

- **Anti-AI Prompt Engineering:**
  - Update system prompts in `src/app/api/agent/stream/route.js`.
  - Enforce **Perplexity** (complex sentence variation) and **Burstiness** (varying sentence length).
  - **Emotional Hooks:** Start articles with questions, anecdotes, or bold opinionated statements.
  - **Forbidden Patterns:** Ban phrases like "In conclusion," "It is important to note," "In today's digital landscape."
- **Niche Tone Control:** Allow setting a "Tone" (e.g., Sarcastic, Professional, Enthusiastic) per run.

## Phase 4: Technical SEO Automation

**Goal:** Automate all requirements for search engine dominance.

- **Automated SEO Metadata:**
  - **Smart Slugs:** Generate keyword-rich, URL-friendly paths (e.g. `/robotics/tesla-optimus-updates` vs `/article/123`).
  - **Meta Descriptions:** Produce high-CTR meta tags autonomously (Click-bait style but honest).
  - **Alt Text:** AI-generated descriptions for images produced by Pollinations.ai.
- **Discovery Logic:**
  - **Internal Linking:** AI logic to analyze existing articles and insert 2-3 relevant internal links in the body.
  - **Schema.org:** Automated injection of `NewsArticle` and `BreadcrumbList` JSON-LD.
  - **Dynamic Sitemap:** Auto-updating `sitemap.xml` for crawler efficiency.

## Execution Order

1. **Phase 3 (Ghostwriter):** First ensure new content is high quality.
2. **Phase 4 (SEO):** Ensure new content is discoverable.
3. **Phase 1 (Dashboard):** Visualize the incoming data.
4. **Phase 2 (CRUD):** Manage the data.

## Verification

- **Quality Check:** Run AI detection tools on sample outputs.
- **SEO Check:** Validate Schema.org markup and Meta tags.
- **UI Check:** Mobile responsiveness of Admin Panel.
