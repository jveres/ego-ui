FROM alpine:3.10 as build
ARG version="master"
WORKDIR /build
RUN apk add --no-cache git ca-certificates alpine-sdk cmake zlib-dev
RUN git clone https://github.com/lpereira/lwan -b ${version} .
RUN mkdir build \
    && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_EXE_LINKER_FLAGS="-static" -DCMAKE_C_FLAGS="-static" \
    && make
RUN strip /build/build/src/bin/lwan/lwan

FROM scratch
COPY --from=build /build/build/src/bin/lwan/lwan /bin/lwan
COPY lwan.conf /etc/lwan.conf
WORKDIR /srv
COPY index.html .
COPY script.js .
COPY style.css .
EXPOSE 8080

ENTRYPOINT ["/bin/lwan", "--config", "/etc/lwan.conf"]