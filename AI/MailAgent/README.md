# Email outreach agent

This folder owns RFQ email formatting, reply monitoring, and provider readiness. Messages are persisted before delivery.

Until `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are configured, email jobs remain stored with `Awaiting Provider` status. `monitor.js` normalizes verified replies and extracts comparable quote fields through the same parsing rules used by WhatsApp.
