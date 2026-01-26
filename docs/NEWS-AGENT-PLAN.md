# News Agent Optimization Plan

## 1. Overview

This plan addresses the user's request to:

1. Simplify the language of AI-generated articles.
2. Implement a scoring system where articles with a score < 750 require manual approval.
3. Change the narrative persona from a personal blogger to a professional TV News Anchor.

## 2. Prompt Engineering (`src/lib/deepseek.ts`)

### Current State

- **Persona:** "Sivri dilli teknoloji yazarı" (Sharp-tongued tech writer).
- **Style:** Personal anecdotes ("Geçenlerde..."), complex sentences, "burstiness".
- **Issues:** Too personal for a news site, language might be too complex.

### New Persona: "TV News Anchor" (Haber Sunucusu)

- **Role:** Professional, objective, authoritative but accessible TV News Anchor.
- **Style:**
  - **No "I" (Ben):** Purely objective 3rd person narrative.
  - **Direct Lead-ins:** Start with the news event, not a personal story.
  - **Simple Language:** Clear, concise Turkish ("Sade ve anlaşılır"). Avoid overly complex sentence structures.
  - **Fact-Based:** Focus on what happened, why it matters, and what's next.

### Scoring System

- The AI must analyze the content quality and assign a score (0-1000).
- **Criteria:**
  - Clarity & Readability
  - Relevance to AI/Tech
  - Factuality
  - Structure (Headline, Body, Conclusion)
- **Output:** The JSON response must include a `score` field.

## 3. Database Schema (`prisma/schema.prisma`)

- **Current:** `Article` model has `status` (DRAFT, PUBLISHED).
- **Update:** Add `score` (Int) field to store the quality score.
  ```prisma
  model Article {
    // ...
    score Int? @default(0)
  }
  ```

## 4. Implementation Logic (`src/lib/deepseek.ts` & Agent Loop)

### Updated `rewriteArticle` Prompt

The prompt will be rewritten to enforce the new persona and scoring requirement.

**New Prompt Structure:**

> "You are a professional TV News Anchor. Rewrite this news with simple, clear Turkish.
> DO NOT use 'I' or personal anecdotes. Start directly with the event.
> Rate the quality of the source material from 0-1000 based on newsworthiness and clarity.
>
> Return JSON:
> {
> 'title': '...',
> 'content': '...',
> 'excerpt': '...',
> 'score': 850,
> ...
> }"

### Agent Execution Logic

In the file where articles are processed (likely `src/app/api/agent/execute/route.ts`):

1. Call `rewriteArticle`.
2. check `result.score`.
3. IF `result.score >= 750`: `status = 'PUBLISHED'` (or existing logic).
4. IF `result.score < 750`: `status = 'DRAFT'`.

## 5. Verification

1. Run the agent.
2. Check database for `score` values.
3. Check Admin Panel: Articles with score < 750 should appear as Drafts.
4. Read sample articles to ensure "News Anchor" tone (No "Geçenlerde...").
