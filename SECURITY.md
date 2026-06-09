# Security Policy

## Reporting a vulnerability

If you discover a security issue, please report it responsibly:

- **Preferred:** [GitHub Security Advisories](https://github.com/rewolf/agent-session-browser/security/advisories/new) (private report; available once the repository is published)
- **Email:** security reports to the maintainer at the contact address associated with the GitHub account **rewolf** (or open a minimal public issue asking for a private channel if email is not listed)

Please include steps to reproduce, affected versions, and impact if known. Do not open public issues with exploit details before a fix is available.

## Response expectations

Maintainers aim to acknowledge reports within **7 days** and to provide a remediation plan or status update within **30 days**, depending on severity and complexity.

## Scope and privacy model

Agent Session Browser is **local-only**: it reads session files from paths on your machine (for example `~/.cursor/` and `~/.claude/`). It does **not** collect, transmit, or store session content on remote servers as part of normal operation. Vulnerability reports should focus on local privilege escalation, unsafe handling of untrusted files, or other issues in this repository’s code and dependencies—not on “data breach” of cloud-hosted session data, because the app does not operate that way by design.
