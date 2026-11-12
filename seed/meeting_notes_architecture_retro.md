# Campus Event Portal - Architecture Retro & Handoff Prep
Date: 2026-10-20T11:00:00Z
Author: Maya (Lead)
ACL: team

## Decision Reversal and Review
- DECISION: We reversed the audit log decision and switched from MongoDB Atlas to PostgreSQL timeseries for audit logging. Reason: Campus compliance audit office mandated SQL relational immutability and window query compliance.
- DECISION: Switched badge generation library from node-canvas to svg2pdf to avoid native cairo binary crashes in container runtime. Reason: Container stability during zero-downtime rolling deploys.
- BLOCKER: Production domain DNS record delegation is blocked awaiting approval from University NetOps ticket #NO-9912.
- ACTION: Aarav will document the emergency database failover recovery procedure before his final day.
- RECURRING PROBLEM: Memory leak observed in ticket socket handler under >2000 concurrent websocket connections. Restart cron runs every 4 hours as a temporary workaround.
