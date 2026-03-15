# CRM — VC deal flow assistant

## How to run the project

### 1. Environment

**Backend** (from project root):

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:

- **DATABASE_URL** — Neon Postgres connection string (with pgvector enabled).
- **GEMINI_API_KEY** — From [Google AI Studio](https://aistudio.google.com/apikey). Used for **embeddings** (`gemini-embedding-001`) and other Gemini-powered utilities.
- **DEEPSEEK_API_KEY** — From your DeepSeek account. Used for the **assistant chat model** (`deepseek-chat`) via `https://api.deepseek.com/chat/completions`.
- **TRANSCRIPTS_DIR** — Path to a folder of transcript files: `.txt`, `.md`, or `.docx` (e.g. `./data/transcripts`). Can be relative to `backend/` or absolute.

### 2. Database

Create the table and extension once (done automatically on first ingest, or run any ingest):

- In Neon: run `CREATE EXTENSION IF NOT EXISTS vector;` then create the `meetings` table, or
- Run the ingest script once (it runs `initSchema()`).

### 3. Ingest transcripts (optional but needed for the assistant)

Put transcript files (`.txt`, `.md`, or `.docx`) in the folder you set as `TRANSCRIPTS_DIR`, then:

```bash
cd backend
npm install
npm run ingest
```

### 4. Start backend and frontend

**Terminal 1 — backend:**

```bash
cd backend
npm start
```

Server runs at **http://localhost:3000**.

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173** (or the port Vite prints). The frontend proxies `/api` to the backend, so the assistant chat talks to `localhost:3000` automatically.

### 5. Use the app

Open the app in the browser and use the Assistant page. Questions are embedded with **Gemini embeddings** (`gemini-embedding-001`), matched to ingested meetings via vector search, and answered by the **DeepSeek chat model** (`deepseek-chat`) with streaming.

---

**Scripts**

| Where    | Command           | Purpose                          |
|----------|-------------------|----------------------------------|
| backend  | `npm start`       | Run API server (port 3000)       |
| backend  | `npm run ingest`  | Ingest from local TRANSCRIPTS_DIR |
| backend  | `npm run ingest:drive` | Ingest from Google Drive (needs Drive env vars) |
| frontend | `npm run dev`     | Run Vite dev server               |
| frontend | `npm run build`   | Production build                  |

### Testing backend routes in Postman

1. **Start the backend** (from `backend/`): `npm start`. It listens on **http://localhost:3000** by default (or the port in `PORT` in `.env`).

2. **POST /assistant/chat** — Assistant chat (streaming):
   - **Method:** POST  
   - **URL:** `http://localhost:3000/assistant/chat`  
   - **Headers:** `Content-Type: application/json`  
   - **Body (raw, JSON):**
     ```json
     { "message": "What did the founders say about revenue?" }
     ```
   - **Response:** Plain text stream (chunked). In Postman you’ll see the full response after it finishes; streaming is best seen in the app or with `curl`.

3. **Quick check with curl:**
   ```bash
   curl -X POST http://localhost:3000/assistant/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Summarize the meetings"}' \
     --no-buffer
   ```
   `--no-buffer` shows the stream as it arrives.

4. **Error cases:** Sending no body or missing `message` returns **400** with `{ "error": "message (string) required" }`. Server errors return **500** with `{ "error": "..." }` (unless the response has already started streaming).

---

### Troubleshooting

- **"fetch failed" or "ETIMEDOUT" when running `npm run ingest`** — The app could not connect to Neon in time. Check: (1) `DATABASE_URL` in `.env` is correct and copied from the Neon dashboard; (2) your Neon project is not paused (open [Neon console](https://console.neon.tech), resume the project if needed); (3) your network allows outbound HTTPS. Retry ingest once or twice after resuming the project; the ingest script will retry the first DB connection automatically.
