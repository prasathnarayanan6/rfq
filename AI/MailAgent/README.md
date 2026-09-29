# Email outreach agent

This folder owns RFQ email formatting, reply monitoring, and provider readiness. Messages are persisted before delivery.

Until `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are configured, email jobs remain stored with `Awaiting Provider` status. When configured, outbound jobs are sent through Nodemailer and updated to `Sent` or `Failed`. `monitor.js` normalizes verified replies submitted by an authenticated integration and extracts comparable quote fields through the same parsing rules used by WhatsApp.

For Gmail, use `smtp.gmail.com` on port `587` with `SMTP_SECURE=false`. `SMTP_PASSWORD` must be a Google App Password, not the account's normal sign-in password.
