FROM pierrezemb/gostatic
WORKDIR /srv/http
COPY index.html .
COPY script.js .
COPY style.css .
CMD ["-port","8080", "-enable-logging"]