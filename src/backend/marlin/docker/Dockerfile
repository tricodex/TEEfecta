# base image
FROM alpine:3.19

ARG TARGETARCH

# install dependency tools
RUN apk add --no-cache net-tools iptables iproute2 wget nodejs npm

# working directory
WORKDIR /app

# supervisord to manage programs
RUN wget -O supervisord http://public.artifacts.marlin.pro/projects/enclaves/supervisord_master_linux_$TARGETARCH
RUN chmod +x supervisord

# transparent proxy component inside the enclave
RUN wget -O ip-to-vsock-transparent http://public.artifacts.marlin.pro/projects/enclaves/ip-to-vsock-transparent_v1.0.0_linux_$TARGETARCH
RUN chmod +x ip-to-vsock-transparent

# key generator to generate static keys
RUN wget -O keygen-ed25519 http://public.artifacts.marlin.pro/projects/enclaves/keygen-ed25519_v1.0.0_linux_$TARGETARCH
RUN chmod +x keygen-ed25519

# attestation server inside the enclave that generates attestations
RUN wget -O attestation-server http://public.artifacts.marlin.pro/projects/enclaves/attestation-server_v2.0.0_linux_$TARGETARCH
RUN chmod +x attestation-server

# proxy to expose attestation server outside the enclave
RUN wget -O vsock-to-ip http://public.artifacts.marlin.pro/projects/enclaves/vsock-to-ip_v1.0.0_linux_$TARGETARCH
RUN chmod +x vsock-to-ip

# dnsproxy to provide DNS services inside the enclave
RUN wget -O dnsproxy http://public.artifacts.marlin.pro/projects/enclaves/dnsproxy_v0.46.5_linux_$TARGETARCH
RUN chmod +x dnsproxy

# supervisord config
COPY supervisord.conf /etc/supervisord.conf

# setup.sh script that will act as entrypoint
COPY setup.sh ./
RUN chmod +x setup.sh

# 4g3n7 application files
COPY ./app /app/agent
WORKDIR /app/agent
RUN npm install
WORKDIR /app
RUN chmod -R +x /app/agent

# entry point
ENTRYPOINT [ "/app/setup.sh" ]