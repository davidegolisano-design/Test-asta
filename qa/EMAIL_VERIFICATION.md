# Email verification — v1.07.17

The public frontend creates rooms exclusively through `liveasta-room-verification`.
The Edge Function has gateway JWT verification enabled, reuses the existing Aruba SMTP
secrets, and sends a six-digit code to the supplied email. No code or SMTP secret is
returned or logged. Only SHA-256 of challenge ID plus code is stored in a private RLS table.

The service-only SQL API stores a pending request, limits sends per email/IP and enforces
60-second resend cooldown, 10-minute expiry, five attempts, resend invalidation, and
idempotent creation. All room data is bound to the pending request before delivery.
Notification to the app administrator and room onboarding happen only after creation.

## Deployment status

- Migration `20260928133843_room_email_verification.sql`: applied.
- Edge Function `liveasta-room-verification`: deployed with verify_jwt=true.
- Frontend: published on liveasta.it on 2026-09-28, v1.07.17.
- `supabase/email-verification-cutover.sql`: applied as `enforce_room_email_verification` on 2026-09-28.
  It removes legacy creation-function EXECUTE and direct room INSERT for client roles.
  Verified: anon/authenticated have neither legacy EXECUTE nor table/column INSERT.
- Both frontend and creation privilege cutover are now deployed.
- If rolling back after cutover, retain the verified frontend/API rather than restoring
  unchecked creation privileges.

## Verification

Node tests cover code format, hash-only storage, send-before-confirm flow, throttled
requests, rejected SMTP delivery, UI cancellation and retries. Transactional database
tests (rolled back) cover no room before verification, wrong code attempt counters,
expiry, resend invalidation, duplicate confirmation and privilege cutover. An anonymous
invalid-action HTTP request returned the expected error, verifying Edge boot/config.
No real mailbox delivery was performed during implementation; verify this in preview.
