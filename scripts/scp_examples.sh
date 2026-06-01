#!/usr/bin/env bash
set -euo pipefail

# Recursively copy the CONTENTS of examples/ to a remote release directory via scp.
# Password authentication is interactive; scp will prompt for the password.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC_DIR="${REPO_ROOT}/examples"

REMOTE_HOST="${REMOTE_HOST:-login}"
REMOTE_BASE_PATH="${REMOTE_BASE_PATH:-/xchip/igv-app/website/web/release/3.8.0/examples}"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "Error: source directory not found: ${SRC_DIR}" >&2
  exit 1
fi

if [[ $# -ge 1 ]]; then
  REMOTE_USER="$1"
else
  read -r -p "Remote username: " REMOTE_USER
fi

if [[ -z "${REMOTE_USER}" ]]; then
  echo "Error: remote username is required." >&2
  exit 1
fi

REMOTE_TARGET="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_PATH}"

echo "Copying contents of ${SRC_DIR}/ to ${REMOTE_TARGET}"
echo "You will be prompted for your SSH password (if key auth is not configured)."

# Use examples/. so only the directory contents are copied, not an enclosing examples folder.
scp -r "${SRC_DIR}/." "${REMOTE_TARGET}"

echo "Done."

