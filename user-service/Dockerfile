# Concept: Build stage to install dev dependencies and compile TypeScript
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Concept: Production stage with minimal size copying only build output and production dependencies
FROM node:18-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "-r", "./dist/tracing.js", "dist/main.js"]
