FROM node:22.14.0-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Компиляция проекта в папку dist
RUN npm run build

FROM node:22.14.0-alpine as production

WORKDIR /app

COPY package*.json ./

RUN npm install --production && \
    npm install -g pm2

COPY --from=builder /app/dist ./dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app

EXPOSE 5000

USER appuser

CMD ["pm2-runtime", "start", "dist/main.js"]
