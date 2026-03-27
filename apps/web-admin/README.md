# Interface Web Admin para meu-chat-local

Uma interface moderna e intuitiva para gerenciar o servidor Ollama local, com chat integrado e dashboard administrativo.

## 🚀 Funcionalidades

### 💬 Seção de Chat
- Conversa interativa com o modelo Ollama rodando localmente
- Suporte a quebras de linha (Shift+Enter)
- Histórico de mensagens em tempo real

### 📊 Dashboard
- **Status em Tempo Real**: Uptime, memória, porta
- **Eventos Recentes**: Feed de atividades do servidor
- **Acesso Rápido**: Links para seções principais (saúde, backups, usuários, incidentes)

### 🏥 Saúde do Sistema
- Status dos componentes: Database, Modelo, Disco
- Indicadores de saúde com cores visuais
- Atualização automática a cada 30 segundos

### 💾 Gerenciamento de Backups
- Listar e validar backups
- Criar backup sob demanda
- Restaurar backups anteriores

### 👥 Gerenciamento de Usuários
- Listar e editar usuários
- Atribuir roles (admin, operator, viewer)
- Criar novos perfis

### 🚨 Monitoramento de Incidentes
- Status operacional atual
- Histórico de incidentes
- Executar auto-healing automaticamente

## 📋 Requirements

- Node.js 18+
- API rodando em `http://localhost:4000`
- npm ou yarn

## 🛠️ Instalação e Uso

### Modo Desenvolvimento

```bash
cd apps/web-admin
npm install
npm run dev
```

A interface estará disponível em **http://localhost:3002**

O proxy automático redireciona `/api/*` para `http://localhost:4000/api/*`

### Build para Produção

```bash
npm run build
npm run preview
```

## 🏗️ Arquitetura

```
apps/web-admin/
├── src/
│   ├── main.js              # Entry point
│   ├── app.js               # Inicialização da app
│   ├── router.js            # Sistema de navegação
│   ├── views/
│   │   ├── chat.js          # Seção de chat
│   │   ├── dashboard.js     # Dashboard principal
│   │   ├── health.js        # Monitoramento de saúde
│   │   ├── backups.js       # Gerenciamento de backups
│   │   ├── users.js         # Gerenciamento de usuários
│   │   └── incidents.js     # Monitoramento de incidentes
│   ├── lib/
│   │   ├── api.js           # HTTP Client para API
│   │   └── appearance.js    # Theme manager
│   └── style.css            # Estilos globais (Tailwind)
├── index.html               # Template HTML
├── vite.config.js           # Configuração Vite
└── package.json
```

## 🎨 Design

- **Tema**: Dark mode com gradientes cyan/indigo
- **UI Framework**: Vanilla JavaScript + Tailwind CSS (sem dependências de framework)
- **Performance**: Sem bundle, apenas ESM nativo
- **Responsividade**: Layout flexível para desktop

## 🔌 Endpoints da API Utilizados

- `GET /api/healthz` — Health check simples
- `GET /api/health/public` — Status de saúde detalhado
- `GET /api/diagnostics/export` — Diagnósticos completos
- `POST /api/chat` — Enviar mensagem para chat
- `GET /api/backup/validate` — Listar e validar backups
- `POST /api/backup` — Criar novo backup
- `GET /api/users` — Listar usuários
- `GET /api/incident/status` — Status de incidentes
- `POST /api/auto-healing/execute` — Executar auto-healing

## 📱 Navegação

Use a sidebar à esquerda para navegar entre:
- **💬 Conversa** — Chat com Ollama
- **📊 Dashboard** — Visão geral do sistema
- **🏥 Saúde** — Status dos componentes
- **💾 Backups** — Gerenciar backups
- **👥 Usuários** — Gerenciar perfis
- **🚨 Incidentes** — Monitorar incidentes

## 🔐 Autenticação

A interface utiliza `x-user-id: user-default` (admin) em todas as requisições.

Para integração com autenticação real, edite [src/lib/api.js](src/lib/api.js).

## 🚀 Próximas Melhorias

- [ ] Autenticação JWT real
- [ ] Modo claro (Light theme)
- [ ] Gráficos de performance (Chart.js)
- [ ] Importação/exportação de configs
- [ ] Socket.io para atualizações em tempo real
- [ ] Temas customizáveis

## 📝 Licença

Parte do projeto meu-chat-local.
