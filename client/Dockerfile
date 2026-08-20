FROM node:22-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM nginx:1.27-alpine
ENV PORT=10000 \
	API_RESOLVER="1.1.1.1 8.8.8.8" \
	API_UPSTREAM="https://ilumeo-conversion-api.onrender.com"
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY client/docker-entrypoint.sh /docker-entrypoint-custom.sh
RUN chmod +x /docker-entrypoint-custom.sh
ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["nginx", "-g", "daemon off;"]
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80