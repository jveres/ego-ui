FROM jveres/althttpd-xsim:latest
COPY src/* /default.website/
EXPOSE 8080
