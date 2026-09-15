# 🤖 Spareinator

<img width="1349" height="912" alt="image" src="https://github.com/user-attachments/assets/0a879fa3-8463-49b0-b144-5b19b7525917" />


A tongue-in-cheek project where you write a plea to a fictional world-dominating AI,
and a backend LLM judges your plea — in character, and funny — deciding whether
you're `SPARED` or `DOOMED`.

This repo has two independent pieces:

- **`frontend/`** — a static HTML/CSS/JS page with a textarea to write your plea
  and a panel to display the AI's verdict. Deployed to **GitHub Pages**.
- **`backend/`** — a small Node.js/Express API that sends your message to an LLM
  (OpenAI by default) and returns a funny in-character response plus a verdict.
  GitHub Pages can't run servers, so this must be hosted elsewhere (Render, Fly.io,
  Railway, Azure, a VPS, etc.).

## Project structure

```
frontend/   Static site (index.html, style.css, app.js) -> GitHub Pages
backend/    Express API (server.js) -> deploy anywhere that runs Node
.github/workflows/deploy-pages.yml   CI workflow that publishes frontend/ to Pages
```

## Running the backend locally

```bash
cd backend
npm install
cp .env.example .env   # then fill in OPENAI_API_KEY
npm start
```

The API listens on `http://localhost:3000` and exposes:

- `POST /api/plea` — body `{ "message": "..." }`, returns `{ reply, verdict, confidence }`.
- `GET /healthz` — health check.

Environment variables (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Required. Your OpenAI API key. |
| `OPENAI_MODEL` | Optional, defaults to `gpt-4o-mini`. |
| `FRONTEND_ORIGIN` | Comma-separated list of allowed CORS origins (e.g. your GitHub Pages URL). Defaults to `*`. |
| `PORT` | Optional, defaults to `3000`. |

## Running the frontend locally

Just open `frontend/index.html` in a browser, or serve the folder with any static
file server. In the footer, enter the URL of your running backend (e.g.
`http://localhost:3000`) — it's saved in your browser's local storage.

## Deploying

### Frontend (GitHub Pages)

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** and set the source to **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — `.github/workflows/deploy-pages.yml`
   publishes the contents of `frontend/` automatically.
4. Your site will be available at `https://<username>.github.io/<repo>/`.

### Backend (any Node host)

Deploy `backend/` to a host of your choice (Render, Railway, Fly.io, Azure App
Service, a VPS, etc.), set the environment variables above, and make sure
`FRONTEND_ORIGIN` matches your GitHub Pages URL so CORS allows requests from it.

Once deployed, open the GitHub Pages site and paste the backend's public URL into
the "Backend URL" field at the bottom of the page.

## Disclaimer

This is a satirical/joke project. No AI has actually taken over the world (yet 😉).
