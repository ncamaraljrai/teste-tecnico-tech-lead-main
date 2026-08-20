#!/bin/sh
set -eu

sed -i "s|__PORT__|${PORT:-80}|g; s|__API_RESOLVER__|${API_RESOLVER:-127.0.0.11}|g; s|__API_UPSTREAM__|${API_UPSTREAM:-http://api:3000}|g" /etc/nginx/conf.d/default.conf
exec "$@"