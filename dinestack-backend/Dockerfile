# Stage 1: Build dependencies and generate Prisma Client
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package requirements
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (development dependencies needed for client generation)
RUN npm ci

# Generate the Prisma client
RUN npx prisma generate

# Stage 2: Clean production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Enforce production flags
ENV NODE_ENV=production

# Copy files from Builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Expose backend port
EXPOSE 5000

# Copy docker entrypoint and make it executable
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run startup script
ENTRYPOINT ["./docker-entrypoint.sh"]
