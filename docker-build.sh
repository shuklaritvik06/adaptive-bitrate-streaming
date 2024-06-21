#!/bin/bash

# Push the Frontend Image to the repository
secrets=$(aws secretsmanager get-secret-value --secret-id webstream/prod/frontend --query SecretString --output text)
docker build -t web-streamer-frontend-repo --build-arg SECRETS="$secrets" .
read -p "Enter the URL of the frontend repository: " frontend_url
docker tag web-streamer-frontend-repo:latest $frontend_url
docker push $frontend_url

# Push the transcoder Image to the repository
cd transcoder
docker build -t web-streamer-repo .
read -p "Enter the URL of the transcoder repository: " transcoder_url
docker tag web-streamer-repo:latest $transcoder_url
docker push $transcoder_url
