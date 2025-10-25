FROM node:20-bookworm

# set working directory
WORKDIR /app

# install pacakges 
COPY package*.json ./
RUN npm ci

# copy application code
COPY . .
ENV HOST=0.0.0.0 PORT=3000 CHOKIDAR_USEPOLLING=true

# open server local host on port 3000
EXPOSE 3000
CMD ["npm","run","dev"]
