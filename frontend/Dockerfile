FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# sirve la SPA
COPY --from=build /app/dist /usr/share/nginx/html
# añade tu server/upstream/map dentro del bloque http por include
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
