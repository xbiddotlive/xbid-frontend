#!/bin/sh
set -eu

if [ -z "${XBID_ENVIRONMENT:-}" ]; then
  echo "Refusing to start: runtime XBID_ENVIRONMENT must be set." >&2
  exit 1
fi

if [ "${XBID_ENVIRONMENT}" != "${XBID_IMAGE_ENVIRONMENT}" ]; then
  echo "Refusing to start: runtime XBID_ENVIRONMENT=${XBID_ENVIRONMENT} does not match image ${XBID_IMAGE_ENVIRONMENT}." >&2
  exit 1
fi

exec node server.js
