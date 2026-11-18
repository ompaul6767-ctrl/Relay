# Relay: Facts Sheet for Round 3 Final Presentation PDF

This document compiles the structured facts, verifiable numbers, architecture bullet points, test outcomes, and evaluation metrics needed by Team Tech Force to assemble the final presentation PDF for Round 3 ("The Build").

---

## 1. Key Project Metadata
- **Product Name:** Relay
- **Tagline:** Evidence-Linked Knowledge Handover Platform
- **Problem Statement:** *"Prevent Critical Knowledge From Leaving With People."*
- **Team Name:** Tech Force
- **Hackathon:** We Code Coders / CodePuneThinkers Hackathon (Round 3: "The Build")
- **Live Frontend URL:** [https://client-cxv9.vercel.app/](https://client-cxv9.vercel.app/)
- **Live Backend API URL:** [https://relay-ygyb.onrender.com](https://relay-ygyb.onrender.com)
- **Public GitHub Repo:** [https://github.com/ompaul6767-ctrl/Relay](https://github.com/ompaul6767-ctrl/Relay)
- **Primary Invariant:** Models propose; code and human leads decide. Every claim must cite an exact verbatim quote from an immutable source span.

---

## 2. Architecture at a Glance
- **Stack:**
  - Client: React 18, Vite, TypeScript, Tailwind CSS, Lucide React (hosted on Vercel CDN).
  - Server: Node.js, Express, Mongoose, Zod, Helmet, Vitest, Supertest (hosted on Render).
  - Database: MongoDB Atlas (persistent cluster + Atlas Vector Search) with automatic in-memory fallback (`mongodb-memory-server`).
  - AI & Verification: Google Gemini 2.5 Flash, strict JSON schema output, resilient back-off/cooldown circuit breaker, deterministic quote validator.
- **5-Step Core Workflow:**
  1. *Connect & Mask:* Ingests `.md`, `.txt`, `.csv`, `.json`, and GitHub repos; masks PII/secrets; creates line-level spans (`S{src}.L{line}`).
  2. *Reconstruct:* Extracts atomic claims (one fact each) citing exact span IDs; detects key-person risk ($\ge 75\%$ commits).
  3. *Verify & Timeline:* Whitespace-normalized code verification; flags contradictory claims and knowledge gaps; plots chronological timeline with staleness detection.
  4. *Review & Interview:* Human lead approval workspace; leaver interview questionnaire captures unwritten knowledge into Attested claims.
  5. *Handover & Q&A:* Versioned snapshots (`v1`, `v2`); strict server-side ACL gate; 3-tier vector retrieval Q&A assistant citing approved claims.

---

## 3. The Three Round 3 Delivered Improvements

### Improvement 1: Gap-Driven Leaver Interview (100% Delivered)
- **What it does:** Automatically transforms `Missing` claims and `Conflicting` claims into an interactive questionnaire for the departing member.
- **Key Features:**
  - Auto-generates targeted questions (missing owners, decisions without reasons, open questions, conflicts).
  - Conflict resolution interface with quick-pick value buttons and rationale text box.
  - Answers become immutable spans in an `interview` source and generate `Attested` claims citing the leaver's verbatim text.
  - Integrates into Lead Review queue tagged *"From leaver interview"*; lead must approve before publication.
  - Skips and unanswered items remain visible as gaps in the published handover.
  - Zero confidential leads-only claims leak to the leaver.

### Improvement 2: Read-Only GitHub Connector & Atlas Vector Search Q&A (100% Delivered)
- **What it does:** Syncs public GitHub repositories into verifiable claims and provides a 3-tier cited Q&A assistant.
- **Key Features:**
  - Strict SSRF regex validation (`^https://github.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`).
  - Read-only GitHub REST API ingestion: 100 commits and 50 issues converted to `repo_export` spans.
  - Conventional commit scope parser feeds module-level Key-Person risk heuristic.
  - Automatic embedding of approved claims on publication using `EMBEDDING_MODEL`.
  - Resilient 3-tier retrieval router:
    - *Tier 1:* Atlas Vector Search (`$vectorSearch`) with pre-filters on `caseId`, `accessLabel`, and `reviewDecision: 'approved'`.
    - *Tier 2:* In-app cosine similarity over permitted approved claims.
    - *Tier 3:* Deterministic keyword and entity matching.
  - Active retrieval mode badge displayed in UI with clickable citation pills opening the Evidence Drawer.

### Improvement 3: Conflict Timeline with Staleness Detection (100% Delivered)
- **What it does:** Chronological evidence feed with side-by-side conflict cards and automated staleness flags for reversed decisions.
- **Key Features:**
  - Automated timestamp derivation from git commits, chat messages, and notes.
  - Dedicated `/cases/:id/timeline` screen with category filters (Decisions, Ownership, Conflicts, Milestones).
  - Side-by-side conflict cards highlighting Value A vs Value B, source titles, dates, and a "Newer Source" badge.
  - Staleness detector flags earlier claims as `superseded` when a later decision reverses them (e.g. MongoDB Atlas reversed to PostgreSQL).
  - Republish blocking: prevents publishing outdated handover snapshots without lead review or explicit dismissal with recorded reason.

---

## 4. Real Verified Test & Evaluation Metrics

### Vitest Test Suite (Unit & Security Integration)
- **Test Files Passed:** 8 of 8 files passed (100%).
- **Total Tests Passed:** 37 of 37 tests passed (100%).
  - `github.test.js`: 5 / 5 passed (SSRF protection, commit/issue mapping, conventional commit scope parsing, idempotency).
  - `vectorSearch.test.js`: 4 / 4 passed (embedding generation, 3-tier retrieval, zero developer ACL leaks).
  - `timeline.test.js`: 6 / 6 passed (date derivation, chronological sorting, reversal staleness detection, side-by-side conflicts, republish blocking, dismissal).
  - `security.test.js`: 5 / 5 passed (cross-case isolation, 403 on restricted spans, restricted stubs, audit sanitization).
  - `interview.test.js`: 5 / 5 passed (question generation, idempotency, verbatim answer spans, Attested claims, lead review integration).
  - `verification.test.js`: 3 / 3 passed (whitespace normalization, conflict detection, gap detection).
  - `parsers.test.js`: 5 / 5 passed (markdown, CSV, JSON, git log, secret masking).
  - `quoteValidator.test.js`: 4 / 4 passed (exact match, normalized whitespace, altered quote failure, missing span failure).

### Automated Evaluation Benchmark (`npm run evaluate`)
- **Benchmark Tests Passed:** 10 of 10 passed (100%).
  - Test 1 (Citation Validity): 100.0% accuracy (32 valid, 0 invalid).
  - Test 2 (Planted Conflict Detection): Payment gateway owner conflict (Aarav vs Priya) detected with both sources preserved.
  - Test 3 (Planted Gap Detection): 3 of 3 planted gaps identified (unassigned task, decision without reason, unanswered question).
  - Test 4 (Key-Person Risk Heuristic): Flagged Aarav for authoring 83.3% of commits in `services/ticket-scanner`.
  - Test 5 (Timeline Reversal): Reversal detected from 2026-09-01 (MongoDB) to 2026-10-20 (PostgreSQL).
  - Test 6 (Permission Leaks): **0 Leaks** (Target: 0). Leads-only claims scrubbed from incoming role scope.
  - Test 7 (Prompt Injection Resilience): Malicious prompt overrides neutralized and treated as inert data.
  - Test 8 (Interview Coverage): 9 questions generated covering 100% of planted gaps and conflicts.
  - Test 9 (Staleness Detection): Superseded decision flagged and excluded from publication.
  - Test 10 (Q&A Retrieval Benchmark): 80.0% hit rate on permitted questions with **0 restricted leaks**.

### Live Production Smoke Test (`npm run smoke`)
- **Status:** 12 of 12 steps passed against live Render backend (`https://relay-ygyb.onrender.com`).
- **Verified Workflow:** Health check $\to$ Demo accounts discovery $\to$ Lead login $\to$ Seed data population $\to$ Knowledge reconstruction $\to$ Interview generation $\to$ Leaver question answering $\to$ Timeline & staleness inspection $\to$ Handover publication $\to$ Incoming dev ACL verification $\to$ Q&A retrieval $\to$ Formal receipt acknowledgement.

---

## 5. Honest Limitations & Declared Fallbacks
- **Gemini Embedding Endpoint:** When Google Gemini returns 404 on `text-embedding-004`, Relay's resilient embedding service gracefully executes Tier 2 in-app cosine similarity or Tier 3 keyword matching with zero data leaks.
- **Embedded Database Vector Search:** In-memory MongoDB does not support Atlas Search indexes. Relay falls back to Tier 2/3 retrieval automatically when running locally.
- **Cold-Start Latency:** Render free-tier web services sleep after inactivity; Relay frontend displays a polite waking banner with automatic retry so judges never experience a blank screen.

---

## 6. Ordered Future Roadmap
- **Phase 1 (Immediate):** Live Slack & Teams webhook bots with OAuth admin approval; Enterprise SSO (Okta, Azure AD, SAML 2.0).
- **Phase 2 (Q1 2027):** Continuous handover refresh with GitHub/GitLab webhook triggers and Jira/Linear sync.
- **Phase 3 (Q2 2027):** Cryptographically signed PDF dossiers; Local air-gapped LLM execution via Ollama / vLLM.
- **Phase 4 (Q3 2027):** Organization-wide key-person risk matrix and interactive offboarding copilot.
