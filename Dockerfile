# PostMed Notebook — static site served by nginx.
# The whole site is plain HTML/CSS/JS with no build step, so this is a straight copy.
FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -f ./index.html ./50x.html
COPY index.html ./index.html
COPY assets ./assets
COPY pages ./pages

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
