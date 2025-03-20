/**
 * Marlin Oyster CVM Configuration
 * 
 * Provides templates and utilities for configuring CVM deployments.
 */

const fs = require('fs');
const path = require('path');

/**
 * Default Dockerfile template for 4g3n7 application
 */
const DEFAULT_DOCKERFILE = `
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

# transparent proxy component inside the enclave to enable outgoing connections
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
RUN chmod -R +x /app/agent

# entry point
ENTRYPOINT [ "/app/setup.sh" ]
`;

/**
 * Default setup.sh template for enclave initialization
 */
const DEFAULT_SETUP_SH = `#!/bin/sh

# setting an address for loopback
ifconfig lo 127.0.0.1
ifconfig

# adding a default route
ip route add default dev lo src 127.0.0.1
route -n

# iptables rules to route traffic to transparent proxy
iptables -A OUTPUT -t nat -p tcp --dport 1:65535 ! -d 127.0.0.1  -j DNAT --to-destination 127.0.0.1:1200
iptables -L -t nat

# generate identity key
/app/keygen-ed25519 --secret /app/id.sec --public /app/id.pub

# starting supervisord
cat /etc/supervisord.conf
/app/supervisord
`;

/**
 * Default supervisord.conf template for process management
 */
const DEFAULT_SUPERVISORD_CONF = `[supervisord]
loglevel=debug
logfile=/dev/stdout
logfile_maxbytes=0

# attestation server
[program:attestation-server]
command=/app/attestation-server --ip-addr 127.0.0.1:1300 --pub-key /app/id.pub
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0

# attestation server proxy
[program:attestation-proxy]
command=/app/vsock-to-ip --vsock-addr 88:1300 --ip-addr 127.0.0.1:1300
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0

# transparent proxy component inside enclave
[program:ip-to-vsock-transparent]
command=/app/ip-to-vsock-transparent --vsock-addr 3:1200 --ip-addr 127.0.0.1:1200
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0

# DNS-over-HTTPS provider
[program:dnsproxy]
command=/app/dnsproxy -u https://1.1.1.1/dns-query -v
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0

# 4g3n7 trading agent application
[program:agent]
command=node /app/agent/server.js
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0

# Agent API proxy
[program:agent-proxy]
command=/app/vsock-to-ip --vsock-addr 88:3000 --ip-addr 127.0.0.1:3000
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stdout
stderr_logfile_maxbytes=0
`;

/**
 * Generate configuration files for deployment
 * @param {Object} options Configuration options
 * @param {string} outputDir Directory to write configuration files
 * @returns {Promise<string[]>} Paths to generated files
 */
async function generateConfigFiles(options = {}, outputDir) {
  if (!outputDir) {
    throw new Error('Output directory is required');
  }
  
  const dockerfile = options.dockerfile || DEFAULT_DOCKERFILE;
  const setupSh = options.setupSh || DEFAULT_SETUP_SH;
  const supervisordConf = options.supervisordConf || DEFAULT_SUPERVISORD_CONF;
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const dockerfilePath = path.join(outputDir, 'Dockerfile');
  const setupPath = path.join(outputDir, 'setup.sh');
  const supervisordPath = path.join(outputDir, 'supervisord.conf');
  
  fs.writeFileSync(dockerfilePath, dockerfile);
  fs.writeFileSync(setupPath, setupSh);
  fs.writeFileSync(supervisordPath, supervisordConf);
  
  return [dockerfilePath, setupPath, supervisordPath];
}

module.exports = {
  DEFAULT_DOCKERFILE,
  DEFAULT_SETUP_SH,
  DEFAULT_SUPERVISORD_CONF,
  generateConfigFiles,
};
