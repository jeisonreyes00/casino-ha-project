FROM node:18-alpine
WORKDIR /app
# copia ambos archivos de dependencias
COPY package.json package-lock.json ./
# instala solo prod
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
CMD ["node","server.js"]