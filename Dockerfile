# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm for serve script
RUN npm install -g pnpm

# Copy dist folder from builder stage
COPY --from=builder /app/dist ./dist

# Create a simple server script to serve static files
RUN echo 'const http = require("http"); const fs = require("fs"); const path = require("path"); const distPath = path.join(__dirname, "dist"); const server = http.createServer((req, res) => { let filePath = path.join(distPath, req.url === "/" ? "index.html" : req.url); fs.stat(filePath, (err, stats) => { if (err) { filePath = path.join(distPath, "index.html"); } fs.readFile(filePath, (err, content) => { if (err) { res.writeHead(500); res.end("Error loading content"); return; } const ext = path.extname(filePath); const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2" }; res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain", "Cache-Control": "public, max-age=31536000" }); res.end(content); }); }); }); server.listen(3000, () => { console.log("Server listening on port 3000"); });' > server.js

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
