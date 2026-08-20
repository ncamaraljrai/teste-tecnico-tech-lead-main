FROM node:22-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80