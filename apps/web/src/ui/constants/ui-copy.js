import { ROUTE_PATHS } from "../routes/navigation.js";

const shell = Object.freeze({
  appTitle: "Meu Chat Local",
  closeMenuLabel: "Fechar",
  responsiveHint: "Responsivo para desktop, tablet e celular.",
  openMenuLabel: "Menu",
  topbarTitle: "Frontend Unico",
  topbarSubtitle: "Mesmo host para usuario e admin em rede domestica.",
  adminShortcutLabel: "/admin",
  adminShortcutPath: ROUTE_PATHS.admin,
});

const product = Object.freeze({
  title: "Produto",
  description:
    "Meu Chat Local e um assistente de IA local-first para uso profissional com foco em privacidade, resiliencia e operacao em rede domestica.",
  featuresTitle: "Principais Caracteristicas",
  features: Object.freeze([
    "Privacidade local com dados na sua maquina",
    "Modo offline sem dependencia obrigatoria de nuvem",
    "Historico persistente de conversas",
    "Modelos customizaveis com Ollama",
    "Importacao e exportacao em JSON/Markdown",
    "Backup e recuperacao de dados",
    "Suporte a documentos (RAG)",
    "Perfis de usuario e controle de acesso",
    "Health e observabilidade integrados",
    "Auditoria de eventos criticos",
  ]),
  requirementsTitle: "Requisitos Basicos",
  requirements: Object.freeze([
    "Node.js 20+",
    "Ollama instalado e em execucao",
    "Navegador moderno (Chrome, Firefox, Safari ou Edge)",
    "Recomendado: 4 GB+ de RAM e espaco para modelos",
  ]),
});

const guide = Object.freeze({
  title: "Guia Rapido",
  steps: Object.freeze([
    {
      label: "Instale dependencias:",
      command: "npm install",
    },
    {
      label: "Suba o modelo local:",
      command: "ollama serve",
    },
    {
      label: "Inicie API + Web:",
      command: "npm run dev --workspace apps/api\\nnpm run dev --workspace apps/web",
    },
  ]),
  accessLabel: "Acesse:",
  accessAppPath: "/app",
  accessAdminPath: "/admin",
  accessSuffix: "para operacao.",
  shortcutsTitle: "Atalhos uteis",
  shortcuts: Object.freeze([
    { key: "Ctrl+N", description: "nova conversa" },
    { key: "Ctrl+K", description: "foco em busca" },
    { key: "?", description: "ajuda de atalhos" },
  ]),
});

export const UI_COPY = Object.freeze({
  shell,
  product,
  guide,
});

export function getShellCopy() {
  return UI_COPY.shell;
}

export function getProductCopy() {
  return UI_COPY.product;
}

export function getGuideCopy() {
  return UI_COPY.guide;
}

// Exports legados para manter compatibilidade com os componentes atuais.
export const SHELL_COPY = getShellCopy();
export const PRODUCT_COPY = getProductCopy();
export const GUIDE_COPY = getGuideCopy();
