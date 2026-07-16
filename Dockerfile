# === BUILD STAGE ===
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (caching layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy project files and build
COPY . .
RUN npm run build


# === PRODUCTION STAGE ===
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# We need the built vite output (dist folder), and server.ts running with tsx, or ideally just bundle server.ts.
# Since the package.json "start" or "dev" runs tsx directly, we will copy node_modules as well for tsx to run.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Install tsx globally or locally to run the server
RUN npm install tsx

COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY zara_database.json* ./

# Expose port
EXPOSE 3000

# Start server using tsx
CMD ["npx", "tsx", "server.ts"]
