FROM node:20-slim AS base

WORKDIR /app

# --- Deps stage: instala dependências de produção via npm workspaces ---
FROM base AS deps

# Copia os manifests de todos os workspaces para aproveitar cache de camadas
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --omit=dev

# --- Build stage: gera os assets de frontend ---
FROM deps AS build

# Instala devDependencies do web somente para o build CSS
COPY apps/web/package.json ./apps/web/
RUN cd apps/web && npm install --include=dev 2>/dev/null || true

COPY apps/web/ ./apps/web/
RUN cd apps/web && npm run build:css 2>/dev/null || true

# --- Runtime stage ---
FROM base AS runtime

# Infraestrutura Node.js do monorepo
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Código-fonte do servidor e dependências compartilhadas
COPY apps/api/ ./apps/api/
COPY modules/ ./modules/
COPY platform/ ./platform/
COPY shared/ ./shared/

# Assets de frontend gerados
COPY --from=build /app/apps/web/ ./apps/web/

# Package.json raiz (type: module, workspaces)
COPY package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "src/entrypoints/index.js"]
