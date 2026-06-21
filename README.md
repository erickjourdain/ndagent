# NDA Guardian - AI-Powered Client NDA compliance analyzer

NDA Guardian is a web application designed to automate the process of reviewing client NDAs. It extracts text from uploaded client NDAs (PDF or DOCX), compares the clauses against a backend-managed **Reference NDA** and a specific compliance checklist (**clausier**), and identifies compliance issues using local **Ollama** AI models.

## Architecture
- **Backend**: Node.js/Express, TypeScript, Multer, PDF-Parse, Mammoth, native fetch connection to Ollama API.
- **Frontend**: React (Vite, TypeScript), Axios, Material UI (MUI).
- **Orchestration**: Docker, Docker Compose, Nginx (as static host and reverse proxy).

---

## Prerequisites
1. **Node.js** (v18+) & **npm**
2. **Docker** & **Docker Compose** (for production mode)
3. **Ollama** (installed and running locally)
   - Download from: [ollama.com](https://ollama.com)
   - Pull the required model (default is `mistral`, can be configured in `.env`):
     ```bash
     ollama pull mistral
     ```

---

## Development Mode

Run the frontend and backend in separate terminals for hot reloading:

### 1. Start the Backend
1. Go to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your configurations in `.env` (configured by default).
4. Run in watch development mode:
   ```bash
   npm run dev
   ```
   *The backend starts at: `http://localhost:5000`*

### 2. Start the Frontend
1. Go to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Set your configuration in `.env` (`VITE_API_URL=http://localhost:5000/api`).
3. Run in development mode:
   ```bash
   npm run dev
   ```
   *The frontend starts at: `http://localhost:5173`*

---

## Production / Containerized Mode

You can run the entire application containerized using Docker Compose:

1. Build and run the containers from the project root:
   ```bash
   docker-compose up --build
   ```
2. Open your browser at:
   - **Frontend**: `http://localhost:3000`
   - **Backend Health Check**: `http://localhost:5000/api/health`

*Note: In Docker, the backend communicates with the host machine's Ollama instance via the hostname `host.docker.internal`.*

---

## Reference Configurations
The reference documents are located in:
- `backend/reference/reference-nda.txt`: The golden standard agreement template.
- `backend/reference/clausier.json`: The rules checklist defining conditions (High/Medium/Low criticality description). Edit this file to add or modify rules.
