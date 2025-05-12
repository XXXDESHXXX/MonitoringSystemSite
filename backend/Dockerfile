FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование исходного кода
COPY . .

# Установка PM2 глобально
RUN npm install -g pm2

# Создание непривилегированного пользователя
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Переключение на непривилегированного пользователя
USER appuser

# Открытие порта
EXPOSE 5000

# Запуск приложения через PM2
CMD ["pm2-runtime", "start", "app.js"]
