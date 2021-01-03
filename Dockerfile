FROM jveres/althttpd-xsim:latest
COPY src/* /default.website/
EXPOSE 8080
CMD ["althttpd", "-https", "1", "-port", "8080", "-root", "/", "-logfile", "/dev/stderr"]