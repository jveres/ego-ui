FROM ubuntu:18.04

RUN apt-get update && apt-get -y install git nasm gcc gcc-multilib binutils build-essential

RUN git clone https://github.com/jveres/toybox.git
WORKDIR /toybox/httpd-asm
RUN LOGGING=0 RELEASE=1 make -B
RUN strip /toybox/httpd-asm/build/httpd

FROM scratch
COPY --from=0 /toybox/httpd-asm/build/httpd /
COPY index.html .
COPY script.js .
COPY style.css .
CMD ["httpd"]