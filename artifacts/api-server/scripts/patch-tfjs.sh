#!/usr/bin/env bash
# Patch @tensorflow/tfjs-node for Node.js v24 compatibility
# Replaces util_1.isNullOrUndefined(x) with x === null || x === undefined
# Run after pnpm install / npm install

set -euo pipefail

NODE_MODULES_DIR="node_modules/.pnpm"
if [ ! -d "$NODE_MODULES_DIR" ]; then
  NODE_MODULES_DIR="node_modules"
fi

find "$NODE_MODULES_DIR" -path "*/@tensorflow/tfjs-node@*/dist/nodejs_kernel_backend.js" 2>/dev/null | while read -r f; do
  if grep -q "isNullOrUndefined" "$f" 2>/dev/null; then
    cp "$f" "${f}.bak" 2>/dev/null || true
    node -e "
      const fs = require('fs');
      const code = fs.readFileSync('$f', 'utf8');
      const patched = code.replace(
        /\(0, util_1\.isNullOrUndefined\)\(([^)]+)\)/g,
        (_, arg) => \`\${arg} === null || \${arg} === undefined\`
      );
      fs.writeFileSync('$f', patched);
    "
    echo "Patched: $f"
  fi
done

find "$NODE_MODULES_DIR" -path "*/@tensorflow/tfjs-node@*/dist/kernels/TopK.js" 2>/dev/null | while read -r f; do
  if grep -q "isNullOrUndefined" "$f" 2>/dev/null; then
    cp "$f" "${f}.bak" 2>/dev/null || true
    node -e "
      const fs = require('fs');
      const code = fs.readFileSync('$f', 'utf8');
      const patched = code.replace(
        /\(0, util_1\.isNullOrUndefined\)\(([^)]+)\)/g,
        (_, arg) => \`\${arg} === null || \${arg} === undefined\`
      );
      fs.writeFileSync('$f', patched);
    "
    echo "Patched: $f"
  fi
done

echo "Done"
