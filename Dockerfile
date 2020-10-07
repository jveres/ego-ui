FROM jveres/static-web-server:latest
WORKDIR /srv
COPY index.html .
COPY script.js .
COPY style.css .