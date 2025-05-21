FROM node:18-alpine
RUN apk update && \
    apk add --no-cache \
      ttf-dejavu \
      fontconfig \
      ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g pm2
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser
EXPOSE 5000
CMD ["pm2-runtime", "start", "app.js"]
