# étape de build
FROM node:13.0.1-alpine as build-stage
WORKDIR /app
COPY . .
RUN npm install browserify -g
RUN npx browserify ./src/pcbfont.js ./src/ibom.js ./src/render.js ./src/htmlFunctions.js ./src/pcb.js ./vender/split.js --debug --outfile index.js

# étape de production
FROM nginx:1.17-alpine as production-stage
COPY --from=build-stage /app /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]