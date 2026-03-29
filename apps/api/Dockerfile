# ─── Stage 1: Dependências de produção ───────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copiar apenas os manifests (cache layer eficiente)
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# npm workspaces: todos os pacotes ficam hoisted em /app/node_modules
RUN npm ci --omit=dev

# ─── Stage 2: Build do Frontend ───────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Instala deps incluindo devDeps para o build Vite
RUN npm ci --workspace apps/web --include=dev

COPY apps/web/ ./apps/web/
RUN npm run build --workspace apps/web

# ─── Stage 3: Runtime enxuto de produção ─────────────────────────────────────
FROM node:20-slim AS runtime

WORKDIR /workspace

ENV NODE_ENV=production
# Garante que o Node encontre os pacotes hoisted na raiz do monorepo
ENV NODE_PATH=/workspace/node_modules

# node_modules da raiz (npm workspaces hoisting — sem subpastas separadas)
COPY --from=deps /app/node_modules ./node_modules

# Código-fonte do servidor e dependências compartilhadas
COPY apps/api/ ./apps/api/
COPY modules/ ./modules/
COPY platform/ ./platform/
COPY shared/ ./shared/

# Assets de frontend gerados pelo Vite (servidos pelo Express em produção)
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Package.json da raiz (type: module, workspaces)
COPY package.json ./

EXPOSE 4000

# Usuário não-root por segurança
USER node

CMD ["node", "apps/api/src/entrypoints/index.js"]
