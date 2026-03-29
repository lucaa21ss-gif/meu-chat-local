# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Prioriza cache de dependencias por manifests.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN npm ci --workspace apps/web --include=dev

COPY apps/web/ ./apps/web/
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/ ./

EXPOSE 80
