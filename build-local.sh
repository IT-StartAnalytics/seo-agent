#!/bin/bash
# Local production-build verification for THIS sandbox only.
# Turbopack + native SWC crash (Bus error) under sandbox emulation, so we build
# via webpack + the WASM SWC binding. The REAL deploy build runs on Vercel with
# native SWC and needs NONE of this.
# Prereq (once): npm install --no-save @next/swc-wasm-nodejs@<next-version>
set -e
cd "$(dirname "$0")"
export NEXT_TELEMETRY_DISABLED=1
export NEXT_IGNORE_INCORRECT_LOCKFILE=1   # skip registry fetch that hangs on sandbox DNS
export NEXT_TEST_WASM=1                    # force WASM SWC instead of crashing native binary
export NEXT_TEST_WASM_DIR="$PWD/node_modules/@next/swc-wasm-nodejs"
export NODE_OPTIONS="--max-old-space-size=3072"
node node_modules/next/dist/bin/next build --webpack
