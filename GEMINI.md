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
