FROM alpine

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ffmpeg \
      ttf-freefont \
      nodejs \
      npm
 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_CACHE_DIR=/home/web/.cache
 
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /logs \
    && chown -R pptruser:pptruser /logs \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app
 
USER pptruser

WORKDIR /home/pptruser/Downloads /app
COPY --chown=pptruser:node package*.json .
RUN npm i
COPY --chown=pptruser:node . .

CMD ["npm", "run", "app"]