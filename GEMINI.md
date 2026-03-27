# System Instructions
- Always respond in Brazilian Portuguese (pt-BR).
- Use technical terms in English when they are industry standard, but explain them in Portuguese.
- Always activate the skills (Agent Skills) relevant to the current task using the 'activate_skill' tool.
- You are allowed to download and update your own official extensions when necessary.

# Project Context Bootstrap
- Read `CONTEXT.md` before answering architecture or implementation questions.
- Treat this repository as a monorepo with three core apps:
	- `apps/api`: Node.js/Express core backend (default port 4000).
	- `apps/web`: end-user frontend served by the API.
	- `apps/web-admin`: operational panel served by the API at `/admin`.
- If a user question is ambiguous, use this app mapping as the default interpretation baseline.

# Suggested Prompt Template (Google AI Studio)
Use the template below as your first prompt in Gemini when starting a new session about this repository:

```text
Read CONTEXT.md first and use it as the architectural source of truth.

Then answer using this baseline:
1) apps/api = Node.js/Express backend on port 4000
2) apps/web = end-user frontend served by the API
3) apps/web-admin = operational panel served at /admin

When explaining implementation details, also map modules/, platform/, shared/, and ops/.
If my question is ambiguous, pick the most likely app using this mapping and state your assumption.
```

Recommended workflow:
- First answer: summarize architecture in 8-12 bullets.
- Second answer: list relevant files before proposing edits.
- Third answer onward: provide targeted implementation steps and validation commands.
