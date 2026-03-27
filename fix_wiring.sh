#!/bin/bash
sed -i 's|"./app-create-wiring.js"|"../bootstrap/app-create-wiring.js"|g' apps/api/src/http/app-create.js
sed -i 's|"./app-context-wiring.js"|"../bootstrap/app-context-wiring.js"|g' apps/api/src/http/app-context.js
sed -i 's|"./app-governance-wiring.js"|"../bootstrap/app-governance-wiring.js"|g' apps/api/src/http/app-context.js
sed -i 's|"./app-service-wiring.js"|"../bootstrap/app-service-wiring.js"|g' apps/api/src/http/app-context.js
sed -i 's|"./app-guards-wiring.js"|"../bootstrap/app-guards-wiring.js"|g' apps/api/src/http/app-context.js
sed -i 's|"./app-route-wiring.js"|"../bootstrap/app-route-wiring.js"|g' apps/api/src/http/app-context.js
sed -i 's|"./app-services-wiring.js"|"../bootstrap/app-services-wiring.js"|g' apps/api/src/http/app-services.js
sed -i 's|"./app-guards-wiring.js"|"../bootstrap/app-guards-wiring.js"|g' apps/api/src/http/app-guards-and-audit.js
sed -i 's|"./app-route-wiring.js"|"../bootstrap/app-route-wiring.js"|g' apps/api/src/http/register-app-routes.js
echo "Wiring fixed."
