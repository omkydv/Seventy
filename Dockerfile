# Seventy in local mode: no database, data kept in /app/web/.local-data.
# The sample surveys open with no key. Set MODEL_API_KEY to count new walks.
FROM node:22-slim

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
