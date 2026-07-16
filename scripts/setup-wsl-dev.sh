#!/usr/bin/env bash
set -euo pipefail

readonly NODE_VERSION="v22.23.1"
readonly NODE_DIST="node-${NODE_VERSION}-linux-x64"
readonly NODE_ARCHIVE="${NODE_DIST}.tar.xz"
readonly NODE_BASE_URL="https://nodejs.org/download/release/${NODE_VERSION}"
readonly INSTALL_ROOT="${HOME}/.local/opt"
readonly BIN_ROOT="${HOME}/.local/bin"

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

cd "${work_dir}"
curl -fsSLO "${NODE_BASE_URL}/${NODE_ARCHIVE}"
curl -fsSLO "${NODE_BASE_URL}/SHASUMS256.txt"
grep "  ${NODE_ARCHIVE}$" SHASUMS256.txt | sha256sum -c -

mkdir -p "${INSTALL_ROOT}" "${BIN_ROOT}"
rm -rf "${INSTALL_ROOT:?}/${NODE_DIST}"
tar -xJf "${NODE_ARCHIVE}" -C "${INSTALL_ROOT}"

for executable in node npm npx corepack; do
    ln -sfn "${INSTALL_ROOT}/${NODE_DIST}/bin/${executable}" "${BIN_ROOT}/${executable}"
done

echo "Node.js installed in ${INSTALL_ROOT}/${NODE_DIST}"
PATH="${BIN_ROOT}:${PATH}" node --version
PATH="${BIN_ROOT}:${PATH}" npm --version
