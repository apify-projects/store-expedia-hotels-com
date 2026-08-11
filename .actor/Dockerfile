# Plain Node image - the scraper is pure HTTP (mobile API), no browser.
FROM apify/actor-node:22 AS builder
COPY package*.json ./
RUN npm install --include=dev --audit=false
COPY . ./
RUN npm run build

FROM apify/actor-node:22
COPY package*.json ./
# Keep optional deps: impit ships its native binary as a platform-specific optional dep.
RUN npm --quiet set progress=false \
    && npm install --omit=dev \
    && echo "Node.js version:" \
    && node --version \
    && rm -r ~/.npm
COPY --from=builder /usr/src/app/dist ./dist
COPY . ./
CMD npm run start:prod --silent
