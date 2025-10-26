FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./server.js

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["npm", "start"]
