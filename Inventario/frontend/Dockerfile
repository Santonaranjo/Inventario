# Frontend Next.js en modo "standalone" (servidor Node mínimo, sin node_modules completos).
#
# NEXT_PUBLIC_API_URL se incrusta en el JavaScript al construir: es la URL con la que el
# NAVEGADOR llama a la API (por eso es localhost:8000 y no el nombre del servicio de Docker).

# ---------- 1) Dependencias ----------
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Tiempos de espera largos: en redes lentas npm puede fallar por timeout.
RUN npm ci --no-audit --no-fund --fetch-timeout=600000 --fetch-retries=5

# ---------- 2) Build ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build

# ---------- 3) Ejecución ----------
FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
