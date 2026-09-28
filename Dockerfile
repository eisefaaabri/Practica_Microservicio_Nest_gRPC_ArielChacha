FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# The port is dynamic in Railway, but we expose 5000 as a fallback hint
EXPOSE 5000

CMD [ "node", "dist/main.js" ]
