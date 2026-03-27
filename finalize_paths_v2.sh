#!/bin/bash
echo "--- FIXING GRANULAR PATHS V2 ---"

# Fix shared subpaths project-wide (EXCLUDING node_modules)
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/app-constants.js|shared/config/app-constants.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|shared/HttpError.js|shared/kernel/errors/HttpError.js|g'

# Fix platform subpaths project-wide (EXCLUDING node_modules)
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|platform/fs/storage-service.js|platform/fs/storage/storage-service.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|platform/fs/backup-archive.js|platform/fs/backup/backup-archive.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|platform/llm/ollama.js|platform/llm/ollama/ollama-client.js|g'

# Fix modules subpaths project-wide (EXCLUDING node_modules)
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|modules/chat/chat-service.js|modules/chat/application/chat-service.js|g'
find . -type d -path './node_modules' -prune -o -name "*.js" -print | xargs sed -i 's|modules/backup/backup-service.js|modules/backup/application/backup-service.js|g'

echo "Granular paths fixed."
