#!/bin/bash
echo "--- FIXING GRANULAR PATHS V3 ---"

# Fix shared subpaths project-wide (EXCLUDING node_modules)
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/app-constants.js|shared/config/app-constants.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/HttpError.js|shared/kernel/errors/HttpError.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/parsers.js|shared/config/parsers.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/model-recovery.js|shared/kernel/model-recovery.js|g'

echo "Granular paths fixed."
