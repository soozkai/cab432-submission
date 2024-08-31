
FROM node:14
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server/server.js"]

