# Concept: Build stage to compile TypeScript code and install dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Concept: Runner stage copying build output and installing production dependencies
FROM node:18-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3002 50051
CMD ["node", "-r", "./dist/tracing.js", "dist/main.js"]
