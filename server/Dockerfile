# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npm run build && npx prisma generate

# Stage 2: Production image
FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE 4000

# On start, ensure sqlite migrations are applied; then launch
CMD npx prisma migrate deploy && node dist/index.js
