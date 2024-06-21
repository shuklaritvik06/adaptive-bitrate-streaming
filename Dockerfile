FROM node:18-alpine AS builder
RUN apk update && apk add --no-cache aws-cli
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG SECRETS
ENV SECRETS=${SECRETS}
RUN npm run build:docker

FROM node:18-alpine
RUN apk update && apk add --no-cache aws-cli
WORKDIR /app
COPY --from=builder /app /app
ARG SECRETS
ENV SECRETS=${SECRETS}
EXPOSE 3000
CMD ["npm","run","start:docker"]