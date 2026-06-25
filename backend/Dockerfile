# Stage 1: Build the TypeScript code
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy reference documents, prompt templates, and seed database needed at runtime
COPY reference ./reference
COPY prompt ./prompt
COPY seed ./seed

EXPOSE 3000

CMD ["node", "dist/index.js"]
