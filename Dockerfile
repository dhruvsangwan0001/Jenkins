# ─────────────────────────────────────────────────────────
# Stage 1: Builder — Node.js build environment
# ─────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

LABEL maintainer="devops@example.com"
LABEL description="React Vite CI/CD Application - Builder Stage"

WORKDIR /app

# Copy dependency manifests first for Docker layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps for build)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for versioning
ARG VITE_BUILD_NUMBER=unknown
ARG VITE_GIT_COMMIT=unknown
ENV VITE_BUILD_NUMBER=${VITE_BUILD_NUMBER}
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}

# Run production build
RUN npm run build

# ─────────────────────────────────────────────────────────
# Stage 2: Production — Nginx static server
# ─────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

LABEL maintainer="devops@example.com"
LABEL description="React Vite CI/CD Application - Production Stage"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
