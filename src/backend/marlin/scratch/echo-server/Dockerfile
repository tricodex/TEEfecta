FROM rust:alpine AS builder
WORKDIR /usr/src/app
COPY . .
RUN apk add musl-dev
RUN cargo build --release

FROM alpine
COPY --from=builder /usr/src/app/target/release/echo-server /usr/local/bin/echo-server
CMD ["echo-server"]
