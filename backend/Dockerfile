# ============================================================
# Stage 1 — Base Node.js environment
# ============================================================
FROM node:22-slim AS base

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies + express
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Set environment variables
ENV NODE_ENV=production \
    GOOGLE_MODEL=gemini-2.5-flash \
    PORT=8000

# Expose port (optional — only if you plan to run a server)
EXPOSE 8000

# Default command — runs the main workflow
# You can override this at runtime with: docker run mcp-agent node src/brightdata_mcp_demo.js "AI news 2025"
CMD ["npm", "start"]
