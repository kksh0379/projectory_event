FROM node:20-alpine
WORKDIR /app
COPY . .
# 외부 의존성 없음 (npm install 불필요)
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
