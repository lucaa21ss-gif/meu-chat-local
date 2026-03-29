FROM node:20-slim AS base

WORKDIR /app

# --- Deps stage: instala dependências de produção via npm workspaces ---
FROM base AS deps

# Copia os manifests de todos os workspaces para aproveitar cache de camadas
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --omit=dev

# --- Build stage: gera os assets de frontend de forma deterministica ---
FROM base AS build

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Instala deps do workspace web (incluindo devDeps para o build Vite)
RUN npm ci --workspace apps/web --include=dev

COPY apps/web/ ./apps/web/
RUN npm run build --workspace apps/web

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
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Package.json raiz (type: module, workspaces)
COPY package.json ./

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "src/entrypoints/index.js"]
