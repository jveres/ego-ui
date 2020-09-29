FROM joseluisq/static-web-server
WORKDIR /public
COPY index.html .
COPY script.js .
COPY style.css .
CMD ["--host", "0.0.0.0", "--port","8080", "--root", "/public", "--assets", "."]