FROM node:20

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY web/package*.json ./web/
RUN cd web && npm ci

COPY server/ ./server/
COPY web/ ./web/

# Gera o CSS final para o frontend antes de iniciar o servidor.
RUN cd web && npm run build:css

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "index.js"]
