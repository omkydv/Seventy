# Seventy in local mode: no database, data kept in /app/web/.local-data.
# Set MODEL_API_KEY to run the models. Without it, the finished surveys still open.
FROM node:22-slim

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
