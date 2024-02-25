FROM node:18.4-alpine

LABEL name="xiaomi-hub-proxy" \
  description="a proxy server for xiaomi hub" \
  maintainer="@qinyang912"

ENV NODE_ENV=production

WORKDIR /usr/src/xiaomi-hub-proxy

COPY . .

RUN npm install --production

EXPOSE 3000

CMD ["npm", "start"]
