FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    imagemagick \
    ffmpeg \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i 's/<policy domain="resource" name="memory" value="256MiB"\/>/<policy domain="resource" name="memory" value="1GiB"\/>/' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
RUN sed -i 's/<policy domain="resource" name="disk" value="1GiB"\/>/<policy domain="resource" name="disk" value="4GiB"\/>/' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p /tmp/uploads /tmp/output

EXPOSE 3000

CMD ["node", "server.js"]
