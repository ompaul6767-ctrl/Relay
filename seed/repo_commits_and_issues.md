# Repository Export: campus-event-portal (git log & issues)

## Git Commit Log
commit 7f2a1b94 - 2026-09-05T12:00:00Z - Aarav <aarav@campus.edu>
    feat(services/ticket-scanner): initialize QR decoding pipeline and zxing binding

commit 8b3c2d10 - 2026-09-12T15:20:00Z - Aarav <aarav@campus.edu>
    feat(services/ticket-scanner): add offline HMAC signature verification for badges

commit 9c4d3e21 - 2026-09-18T18:45:00Z - Aarav <aarav@campus.edu>
    perf(services/ticket-scanner): optimize memory buffer for high frequency scanner pulses

commit a1b2c3d4 - 2026-09-28T09:10:00Z - Priya <priya@campus.edu>
    fix(services/ticket-scanner): fix timestamp clock drift tolerance on Android scans

commit b2c3d4e5 - 2026-10-04T14:00:00Z - Aarav <aarav@campus.edu>
    feat(services/ticket-scanner): implement camera stream fallback for low light tents

commit c3d4e5f6 - 2026-10-18T16:30:00Z - Aarav <aarav@campus.edu>
    refactor(services/ticket-scanner): decouple scanner engine from legacy SQLite storage

commit d4e5f6a7 - 2026-10-02T11:00:00Z - Rohan <rohan@campus.edu>
    feat(ui/tokens): export Tailwind color palette and dark mode variables

commit e5f6a7b8 - 2026-10-10T13:40:00Z - Priya <priya@campus.edu>
    feat(api/gateway): configure rate limiting and CORS policies for campus domains

## Open Repository Issues
### Issue #42: Flaky redis cache reconnection during network partitions
- State: open
- Author: Aarav
- Labels: bug, backend, risk
- Description: When the campus subnet reconnects after an outage, the ioredis cluster client fails to re-subscribe to the ticket invalidation channel without manual service restart.

### Issue #57: Staging deployment credentials rotation
- State: open
- Author: Maya
- Labels: security, devops, action
- Description: Staging deploy keys on AWS ECS must be rotated before the end of the semester.
