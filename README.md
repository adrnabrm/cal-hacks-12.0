# 🧠 tResearch

### Overview  
**tResearch** is an **agentic AI platform** that autonomously discovers, summarizes, and connects scholarly resources.  
It integrates **Gemini**, **Bright Data MCP**, **Supabase**, and **Chroma** to create a reasoning pipeline capable of web scraping, semantic embedding, contextual retrieval, and persistent output storage.

---

### ⚙️ Tech Stack

| Layer | Technology | Description |
|--------|-------------|-------------|
| **Frontend** | **Next.js**, **TailwindCSS**, **D3.js** | Interactive web app for visualizing research relationships as dynamic trees. |
| **Backend** | **Express.js**, **Node.js** | API layer coordinating data retrieval, reasoning, and embedding. |
| **Agentic AI Core** | **Gemini API (Google)** | Performs summarization, semantic reasoning, and embedding generation. |
| **Web Scraping Layer** | **Bright Data MCP** | Fetches scholarly content and metadata in real time. |
| **Vector Database** | **ChromaDB Cloud** | Stores Gemini embeddings for retrieval-augmented generation (RAG). |
| **Data Storage & Auth** | **Supabase** | Stores structured outputs, manages user sessions, and tracks query history. |
| **Deployment** | **Docker**, **Docker Compose** | Containerized deployment for reproducible multi-service orchestration. |
| **Version Control** | **Git + GitHub** | Source code management and CI/CD integration. |

---

### 🧠 Agentic AI Flow

1. **User Input:** Query provided through the Next.js frontend.  
2. **Scraping:** Bright Data MCP retrieves relevant papers, abstracts, and metadata.  
3. **Reasoning:** Gemini processes the scraped text, generates embeddings, and identifies semantic relationships.  
4. **Embedding Storage:** ChromaDB stores the embeddings for contextual retrieval.  
5. **Output Logging:** Supabase saves reasoning results, user history, and summaries.  
6. **Visualization:** Next.js + D3.js render a dynamic knowledge graph linking related works.  
7. **RAG Chat:** Gemini references Chroma vectors to provide contextual answers and summaries.

---

### 🐳 Deployment

#### Prerequisites
- Docker & Docker Compose  
- API credentials:  
  - `GEMINI_API_KEY`  
  - `BRIGHT_DATA_API_KEY`  
  - `SUPABASE_URL`  
  - `SUPABASE_KEY`  
  - `CHROMA_TOKEN`

**Start up with Docker Compose!**

```bash
docker compose up --build
```

#### `.env` Example
```env
PORT=8080
GEMINI_API_KEY=your_gemini_key
BRIGHT_DATA_API_KEY=your_brightdata_key
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your_supabase_service_key
CHROMA_TOKEN=your_chromadb_token


# CalHacks 12.0
UC Berkeley 40-hour Hackathon project made by:
* Adrian Abraham
* Angelo Cervana
* Matthew Fehr
* William Luu
