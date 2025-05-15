FROM node:18-alpine

# Устанавливаем системные зависимости и DejaVu‑шрифты
RUN apk update && \
    apk add --no-cache \
      ttf-dejavu \
      fontconfig \
      ca-certificates

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем исходники
COPY . .

# Устанавливаем PM2 для продакшен‑запуска
RUN npm install -g pm2

# Создаём непривилегированного пользователя и меняем владельца
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["pm2-runtime", "start", "app.js"]
