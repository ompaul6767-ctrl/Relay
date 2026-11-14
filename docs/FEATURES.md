# Relay: Feature Status Matrix

This document provides a transparent, honest accounting of all completed, partial, and planned features in Relay.

---

## 1. Completed Features (100% Implemented & Verified)

### Core Workflow (Scored: 30 pts)
- [x] **Source Ingestion (Connect):** Supports file uploads and pasted text across `.md`, `.txt`, `.csv`, and `.json`. Handles meeting notes, task board CSVs (`id,task,owner,status,due`), chat JSON (`[{ts, author, text}]`), and repository exports (git commits and issues).
- [x] **Mandatory Consent & ACL Labels:** Enforces access labels (`team`, `leads_only`, `owner_only`) and consent confirmation ("I am authorised to use this source"). Ingestion strictly blocked without both.
- [x] **Secret Masking on Ingestion:** Automatically masks API keys (Google, OpenAI, GitHub, AWS), credit cards, passwords, emails, and phone numbers before storing or prompting.
- [x] **Span Partitioning with Stable IDs:** Generates immutable spans with IDs (`S{src}.L{line}`) preserving author and timestamps.
- [x] **Reconstruction Pipeline:** Extracts atomic claims (one fact each), identifies decisions with reasons, owners, risks, dependencies, blockers, open questions, next actions, and recurring problems.
- [x] **Deterministic Quote Verification:** Checks that cited span IDs exist and validates exact whitespace-normalized substring matches. Rejects unbacked claims with reason `"citation failed"`.
- [x] **Second-Pass AI Support Check:** Evaluates whether cited spans logically support the claim (`yes`, `partial`, `no`), demoting claims to `Inferred` or rejecting on failure.
- [x] **Conflict Detection Engine:** Groups claims by `entityKey` + `attribute`. Detects differing values from distinct sources (e.g. Payment Gateway owner Aarav vs Priya), surfaces both citations and dates, and never auto-picks a winner.
- [x] **Gap Detection Engine:** Flags unassigned tasks, decisions lacking rationale, and open questions without recorded answers as `Missing` claims with suggested contacts.
- [x] **Key-Person Risk Heuristic:** Flags any team member authoring $\ge 75\%$ of $\ge 3$ commits in a module as an `Inferred` key-person risk.
- [x] **Review Workspace:** Split-view workspace with evidence panel showing highlighted source quotes, validation results, and AI support verdicts.
- [x] **Lead Review Actions:** One-click Approve, Edit (becomes `Attested` with reviewer's name), Reject, and Resolve (records winner & rationale). Includes keyboard shortcuts (`A`, `R`, `E`).
- [x] **Interactive Citation Check Tester:** Live button submitting fabricated quotes to demonstrate deterministic citation rejection.
- [x] **Publication & Diff Versioning:** Publishes immutable version snapshots with diff calculations (`added`, `modified`, `removed`).
- [x] **Server-Side ACL Filtering:** Enforces strict server-side filtering on all endpoints. Restricted items are removed before building responses and returned as explicit stubs (`count`, `isRestrictedStub: true`).
- [x] **Role-Differentiated Handovers:** Developer view (tech decisions, architecture, runbook, Day 1/W1/D30) vs Designer view (design tokens, assets, contacts).
- [x] **Formal Receipt Acknowledgement:** Recipient can formally acknowledge receipt of a specific version and raise questions back to the lead.
- [x] **Synthetic Demo Project:** One-click loader for "Campus Event Portal" with Aarav (departing member) and all 6 planted situations.
- [x] **Zero-Sign-in Demo Logins:** Instant persona switching between Lead, Incoming Dev, and Incoming Designer.
- [x] **Automated Evaluation Harness:** `npm run evaluate` validates all planted scenarios against `answer-key.json` with 100% pass rate.

---

## 2. Partial Features

- [~] **Cited Q&A Assistant:** Implemented as a stretch endpoint (`POST /api/cases/:id/ask`) answering questions cited ONLY from approved claims within the user's ACL. Supports Gemini generative retrieval with fallback to keyword-based semantic claim matching. (Atlas Vector Search embeddings planned for Round 3).
- [~] **Live Dark/Light Mode Theme:** Driven by design tokens, fully toggleable with persistent user preference in localStorage.

---

## 3. Planned Features (Designed For, Not Started in Round 2)

- [ ] **Gap-Driven Leaver Interview:** Turning Missing and Conflicting claims into interactive questionnaires for the departing member, converting answers directly into Attested claims.
- [ ] **Live Third-Party Connectors:** Direct OAuth webhooks for Slack, Microsoft Teams, Jira, and Linear.
- [ ] **Atlas Vector Search & GitHub Connector:** Native Atlas Vector Search embedding index coupled with read-only GitHub repository syncing.
