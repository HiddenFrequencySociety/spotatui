# Hosted-mode image for the spotatui fork (branch: hosted).
# Stage 1: build the web frontend.
FROM node:22-bookworm-slim AS gui
WORKDIR /app/gui
COPY gui/package.json gui/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY gui/ ./
RUN npm run build

# Stage 2: build the Rust backend with the gui frontend embedded.
FROM rust:slim-bookworm AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends pkg-config libssl-dev libasound2-dev perl make \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
COPY --from=gui /app/gui/dist ./gui/dist
RUN cargo build --release --locked --no-default-features \
  --features telemetry,gui,streaming,internet-radio

# Stage 3: slim runtime. ALSA lib is linked even though a headless host has no
# audio device; playback targets Spotify Connect devices.
FROM debian:bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends libasound2 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/spotatui-gui /usr/local/bin/spotatui-gui
ENV SPOTATUI_BIND=0.0.0.0:10000
EXPOSE 10000
CMD ["spotatui-gui"]
