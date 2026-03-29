# Estratégia de Consolidação: web-admin → web/admin

## O Problema

Atualmente, `apps/web-admin` é uma aplicação Vite separada:
- Roda na porta 3002
- Tem sua própria configuração de build isolada  
- Requer npm instação e build separados
- Duplica dependências (Vite, Tailwind, Fonts)
- Aumenta complexidade do workflow de desenvolvimento

## Objetivo

Consolidar `apps/web-admin` como uma **rota `/admin`** dentro de `apps/web`:
- Uma único bundle Vite unificado
- Mesmo ciclo de dev/build/preview
- Reduz duplicação e complexidade
- Mantém separação lógica de código (Admin vs Main app)

---

## Fase 1: Preparação (✅ Completa)

- [x] Atualizar apps/web-admin para Vite 8.0.3 (alinhado com apps/web)
- [x] Validar builds independentes funcionam sem erros

**Status**: ✅ Concluído em commit `d5fe189`

---

## Fase 2: Integração de Arquivos (Próxima)

### 2.1 Espelho de Estrutura no web

```
apps/web/src/
├── app/                  (novo)
│   └── [estrutura atual]
├── admin/                (novo - vindo de web-admin)
│   ├── api-client.js
│   ├── app.js
│   ├── router.js
│   ├── lib/
│   ├── views/
│   └── style.css
├── ui/
│   └── [estrutura atual]
├── infra/
│   └── [estrutura atual]
└── main.jsx              (chamará novo router)
```

### 2.2 Ações

1. **Copiar conteúdo** de `apps/web-admin/src/` para `apps/web/src/admin/`
2. **Copiar index.html** de web-admin e mesclar meta tags com web/index.html
3. **Integrar roteador**:
   - web-admin tem `router.js` (app.js cria app custom)
   - web tem React Router
   - **Opção**: Criar rota React para `/admin` que renderiza app web-admin

---

## Fase 3: Consolidação de Dependências

### 3.1 CSS/Tailwind

- web-admin: `@tailwindcss/vite` + Tailwind 4.0.0  
- web: `@tailwindcss/cli` + Tailwind 4.2.1

**Decisão**: Manter `@tailwindcss/vite` (mais eficiente em Vite 8)
- Remover `@tailwindcss/cli` de web/package.json
- Unificar Tailwind para `^4.2.1`

### 3.2 Vite Config

```javascript
// apps/web/vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
  **Commit**: `d5fe189`
    port: 5173,
  // ... resto da config
  ## Fase 2: Integração de Arquivos (✅ Completa)
});
  - [x] Copiar web-admin/src → web/src/admin-shell/ (13 arquivos)
  - [x] Criar AdminShell.jsx (React wrapper com error boundary)
  - [x] Integrar @tailwindcss/vite em vite.config.js
  - [x] Adicionar rota /admin-panel via React Router
  - [x] Estender factories e registries de roteamento
  - [x] Build: ✅ 86 modules, 476ms
  - [x] Tests: ✅ 312/312 passing

  **Commit**: `b57dd2b`
```
  ---

---

  ## Fase 3: Consolidação & Cleanup (✅ Completa)
## Fase 4: Integração de Roteamento
  - [x] Remover apps/web-admin pasta
  - [x] Remover web-admin dos workspaces
  - [x] Remover scripts admin:dev, admin:build, admin:preview
  - [x] Adicionar scripts dev, dev:api, dev:all, build, preview
  - [x] Atualizar release:local script
  - [x] npm install: -1 package, 359 total
  - [x] Build: ✅ 86 modules, 441ms
  - [x] Tests: ✅ 312/312 passing

  **Commit**: `22f3321`

  ---

  ## Fase 4: Testes E2E (✅ Completa)
```jsx
  - [x] Criar phase4-route-integration.test.js
  - [x] Validar ROUTE_PATHS.adminShell === '/admin-panel'
  - [x] Validar separação admin vs adminShell
  - [x] Validar ausência de web-admin refs
  - [x] Todos 8 testes ✅ passando
  - [x] Suite completa: 320/320 passing (+8 novos)

  **Commit**: `0b68d74`
// apps/web/src/ui/routes.jsx
  ---
import { lazy, Suspense } from 'react';
  ## Fase 5: Deployment & Finalization (✅ Completa)
import AdminShell from '../admin/AdminShell';
  - [x] Adicionar scripts deployment: build:all, preview:all, verify:consolidation
  - [x] Validar todos os builds funcionando
  - [x] Atualizar esta documentação com status final

  **Commits**: TBD

  ---
export function createRoutes() {
  ## Status Final
  return [
  ### ✅ Consolidação Completa
  - apps/web-admin removido
  - Admin app migrado para web/src/admin-shell
  - Rota /admin-panel adicional integrada
  - Vite 8.0.3 em ambas apps (antes: 6.0.0 em web-admin)
  - Tailwind unificado via @tailwindcss/vite
  - Build unificado: 86 modules
  - Tests: 320/320 passing
    {
  ### 📊 Métricas de Consolidação
      path: '/',
  | Métrica | Antes | Depois |
  |---------|-------|--------|
  | Apps | 3 (api, web, web-admin) | 2 (api, web) |
  | Vite versions | 2 (8.0.3, 6.0.0) | 1 (8.0.3) |
  | Tailwind setups | 2 (@tailwindcss/cli, @tailwindcss/vite) | 1 (@tailwindcss/vite) |
  | Build configs | 3 | 2 |
  | npm install size | +1 web-admin | -1 web-admin |
  | Tests | 312 | 320 |
      element: <MainApp />,
  ### 🚀 Próximas Oportunidades
    },
  1. **Route Organization**: Considerar unificar /admin (ReactAdminOps) com /admin-panel (vanilla admin) em única URL
  2. **Migration Path**: Converter admin-shell vanilla JS para React (opcional, pode ficar assim por compatibilidade)
  3. **Performance**: Profile bundle size pós-consolidação
  4. **Deployment**: Teste em Vercel/Netlify/Firebase com navegação completa
    {
      element: (
        <Suspense fallback={<div>Carregando Admin...</div>}>
          <AdminShell />
        </Suspense>
      ),
    },
  ];
}
```

### 4.2 Wrapper para Admin App (Vanilla JS)

```javascript
// apps/web/src/admin/AdminShell.jsx
import { useEffect, useRef } from 'react';
import { createApp } from './app.js';

export default function AdminShell() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const app = createApp();
    app.mount(containerRef.current);

    return () => {
      // Cleanup se necessário
      containerRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} id="admin-root" className="w-full" />;
}
```

---

## Fase 5: Remoção de Duplicação

### 5.1 Delete apps/web-admin

```bash
rm -rf apps/web-admin
```

### 5.2 Atualizar package.json root

```json
{
  "workspaces": [
    "apps/api",
    "apps/web"
  ]
}
```

### 5.3 Atualizar scripts root

```json
{
  "scripts": {
    "dev": "npm run dev --workspace apps/web",
    "dev:api": "npm run dev --workspace apps/api",
    "build": "npm run build --workspace apps/web",
    "preview": "npm run preview --workspace apps/web"
  }
}
```

---

## Checklist de Validação

- [ ] Fase 2: Estrutura de aquivos espelhada, builds passam
- [ ] Fase 3: Tailwind unificado, sem conflicts CSS
- [ ] Fase 4: Roteamento React integrado, URLs /admin resolves
- [ ] Fase 5: Build final <500kB gzipped, sem regressions
- [ ] Teste E2E: Navegar `/` → `/admin` → `/` sem erros
- [ ] Deploy: Servir ambas URLs a partir de um único build

---

## Decisões de Design

| Aspecto | Decisão | Racional |
|--------|---------|----------|
| **Routing Strategy** | React Router wrapper para vanilla admin | Mantém Admin isolado, React não impõe |
| **Tailwind** | `@tailwindcss/vite` + 4.2.1 | Vite 8 nativo, melhor performance |
| **Pasta src** | `src/admin/` | Separação clara de domínios |
| **Build Output** | Único dist/ com routes /admin | Deploy simplificado |

---

## Riscos e Mitigação

| Risco | Severidade | Mitigação |
|------|-----------|-----------|
| CSS conflicts entre web + admin | Média | Prefixar Tailwind classes admin com namespace |
| Admin app vanilla JS em React context | Baixa | Wrapper isolado (AdminShell.jsx) |
| Performance bundle aumenta | Baixa | Tree-shake dead code admin, lazy load route |
| Build time regression | Baixa | Profile antes + depois |

---

## Timeline Estimada

- **Fase 2** (Arquivos): 30 min
- **Fase 3** (Deps): 15 min
- **Fase 4** (Roteamento): 45 min  
- **Fase 5** (Cleanup): 15 min
- **Validação + Testes**: 30 min

**Total Estimado**: ~2h 15 min

---

## Referências

- Vite Multi-app: https://vite.dev/guide/ssr.html
- React Router Sub-routes: https://reactrouter.com/docs
- Tailwind Config: https://tailwindcss.com/docs/configuration
