# Campus Event Portal - Sprint Kickoff Meeting Notes
Date: 2026-09-01T10:00:00Z
Author: Maya (Lead)
ACL: team

## Attendees
- Maya (Engineering Lead)
- Aarav (Senior Backend Engineer - Departing)
- Priya (Fullstack Developer)
- Rohan (UI/UX Designer)

## Architecture Decisions
- DECISION: We will use Next.js for the public student portal frontend and Express for the core API services. Reason: Next.js provides server-side rendering required for student event SEO.
- DECISION: We will use MongoDB Atlas for audit log retention. Reason: Fast JSON ingestion for high throughput during campus rush events.
- DECISION: Authentication will use Google OAuth 2.0 with campus domain restriction (@campus.edu). Reason: Single sign-on prevents unauthorized event registrations.

## Unassigned Work & Open Questions
- OPEN QUESTION: Who has the master encryption keys for QR code ticket generation?
- DEPENDENCY: Production Redis cache instance depends on Campus IT security firewall clearance.
- RISK: Campus WiFi bandwidth is notoriously unstable during the annual cultural festival; ticket scanner offline caching is critical.
