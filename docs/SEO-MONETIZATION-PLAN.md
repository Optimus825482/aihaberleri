# SEO & Monetization Strategy Plan: "Traffic Magnet"

> **Goal:** Transform the site from a passive news aggregator into a viral traffic magnet optimized for high ad revenue (Monetization) and search dominance.

## 🎯 Executive Summary

The current system ranks news based on "Media Echo" (how many other sites wrote about it). To achieve high ad revenue and search dominance, we must shift to "User Demand" (what people are actually searching for).

**Key Strategy Shift:**

- **From:** `RSS Feed -> Check Popularity -> Publish`
- **To:** `Trend Detection (Google/Social) -> Content Discovery -> Optimized Creation -> Viral Distribution`

---

## 🏗 Phase 1: "Trend-First" Architecture (The Brain)

We need to know what is trending _before_ we look for news.

### 1.1. Integration of Google Trends / Twitter Trends

- **New Source:** Implement a "Trend Pulse" service that queries Google Trends Daily Search Trends (via RSS or API wrapper) and Twitter Trending Topics.
- **Impact:** Ensures we are writing about topics with _proven_ traffic volume.

### 1.2. "Viral/Social" Scoring Update (`src/lib/tavily.ts`)

- **Current:** Scores based on similar article count (Reverberation).
- **New Logic:**
  - **Discussion Weight:** Boost score if search results include `reddit.com`, `twitter.com`, `hackernews`, `quora`. (High engagement = High retention).
  - **YouTube Boost:** If search results have Video Carousels, it's a high-intent visual topic.
  - **Keyword Competition:** Avoid topics with 1B+ results if we are small; target "Rising Stars".

---

## 🎨 Phase 2: "Ad-First" UX & Curiosity Structure (The Face)

Ad revenue = Viewability + Time on Site.

### 2.1. "Curiosity Gap" Headlines

- **Refactor:** Update the AI rewriter prompt to generate titles that invoke curiosity without clickbaiting (The "Upworthy" method, modernized).
- **Structure:** Title must answer "Why does this matter?" not just "What happened?".

### 2.2. Optimized Ad Layouts

- **In-Content Slots:** Modify `src/app/news/[slug]/page.tsx` to inject ad placeholders every 3 paragraphs.
- **Sticky Sidebar:** Ensure the sidebar (desktop) is sticky with high-CPM vertical units.
- **Mobile Vignette Prep:** Ensure route transitions support full-screen interstitials (Google Auto Ads).

### 2.3. "Stickiness" Features

- **Infinite Scroll / Read Next:** Auto-load the next trending article to keep the session alive.
- **"Most Read" Widget:** Driven by real analytics (or simulated "Hot" score) to direct traffic to high-RPM pages.

---

## ⚡ Phase 3: Technical SEO (The Engine)

Speed is a ranking factor. Ads slow down sites. We must compensate.

### 3.1. Core Web Vitals Optimization

- **CLS Protection:** Reserve fixed height for images/ads to prevent layout shifts (Critical for passing Google checks).
- **LCP Optimization:** Preload the "Hero Image" of the article.

### 3.2. Advanced Schema

- **FAQ Schema:** Generate FAQ sections for news to take up more pixel space on Google Search (SERP Dominance).
- **VideoObject Schema:** If we have video embeds, tag them to appear in Video tabs.

---

## 📝 Implementation Plan (Orchestration)

### Step 1: Backend (Logic)

- [x] Create `TrendPulseService` to fetch Google Trends.
- [x] Update `news.service.ts` to mix RSS items with Trend items.
- [x] Upgrade `tavily.ts` scoring algorithm.

### Step 2: Content (AI)

- [x] Update Prompt for "Curiosity Headlines".
- [x] Add "FAQ Generation" step to the content rewriter.

### Step 3: Frontend (UX/SEO)

- [x] Add `AdUnit` component with CLS protection.
- [x] Implement "Read Next" logic.
- [x] Verify `robots.txt` and `sitemap.xml` automation.

---

## 🚦 Decision Point

Do you approve this "Trend-First" restructuring?

**Yes:** I will activate the Agents (`backend-specialist`, `frontend-specialist`) to begin Phase 1 (Scoring & Trends).
**No:** We can stick to the current RSS-based system and just minorly tweet SEO tags.

**Status Update: ALL SYSTEMS GO. Traffic Magnet is LIVE.**
