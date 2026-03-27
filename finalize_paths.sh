#!/bin/bash
echo "--- FIXING GRANULAR PATHS ---"

# Fix shared subpaths project-wide
find . -name "*.js" -exec sed -i 's|shared/app-constants.js|shared/config/app-constants.js|g' {} +
find . -name "*.js" -exec sed -i 's|shared/HttpError.js|shared/kernel/errors/HttpError.js|g' {} +

# Fix platform subpaths project-wide (if any)
find . -name "*.js" -exec sed -i 's|platform/fs/storage-service.js|platform/fs/storage/storage-service.js|g' {} +
find . -name "*.js" -exec sed -i 's|platform/fs/backup-archive.js|platform/fs/backup/backup-archive.js|g' {} +
find . -name "*.js" -exec sed -i 's|platform/llm/ollama.js|platform/llm/ollama/ollama-client.js|g' {} +

# Fix modules subpaths project-wide (if any)
find . -name "*.js" -exec sed -i 's|modules/chat/chat-service.js|modules/chat/application/chat-service.js|g' {} +
find . -name "*.js" -exec sed -i 's|modules/backup/backup-service.js|modules/backup/application/backup-service.js|g' {} +

echo "Granular paths fixed."
