/**
 * @module platform/config/env-validator
 * @description Fail-Fast validador de variáveis de ambiente.
 *
 * Filosofia: É muito melhor o sistema morrer na linha 1 do boot com
 * uma mensagem de erro clara do que falhar silencioso no meio de um chat
 * com um "Cannot read property of undefined" no log.
 *
 * Chamado ANTES de qualquer instanciação de providers ou banco de dados.
 */

const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

/**
 * Regras de validação por domínio.
 * Cada entrada define:
 *  - key: nome da variável de ambiente
 *  - required: se ausência deve travar o boot (true = ERRO, false = WARNING)
 *  - condition: função opcional — só aplica a regra SE ela retornar true
 *  - hint: mensagem de ajuda para o desenvolvedor
 */
const ENV_RULES = [
  // ─── MODO DE OPERAÇÃO ───────────────────────────────────────────────────
  {
    key: "NODE_ENV",
    required: false,
    hint: "Recomendado definir como 'production' em produção. Default: 'development'.",
  },

  // ─── PROVEDOR OLLAMA (modo padrão local) ───────────────────────────────
  {
    key: "OLLAMA_HOST",
    required: false,
    condition: () => process.env.USE_OPENAI !== "true",
    hint: "URL do Ollama local. Default: http://127.0.0.1:11434. Ajuste se o Ollama rodar em outro host/container.",
  },

  // ─── PROVEDOR OPENAI (modo cloud, opcional) ────────────────────────────
  {
    key: "OPENAI_API_KEY",
    required: true,
    condition: () => process.env.USE_OPENAI === "true",
    hint: "USE_OPENAI=true foi ativado mas OPENAI_API_KEY não está definida! Defina no .env ou remova USE_OPENAI=true para usar o Ollama local.",
  },

  // ─── SEGURANÇA ──────────────────────────────────────────────────────────
  {
    key: "JWT_SECRET",
    required: false,
    hint: "Recomendado definir explicitamente em produção para segurança dos tokens de autenticação.",
  },

  // ─── ORIGem CORS ────────────────────────────────────────────────────────
  {
    key: "FRONTEND_ORIGIN",
    required: false,
    hint: "Lista de origens CORS permitidas separadas por vírgula. Importante em produção para evitar CORS aberto.",
  },
];

/**
 * Executa a validação Fail-Fast do ambiente.
 * Imprime diagnóstico formatado no terminal.
 * @throws {Error} se houver variável marcada como `required` ausente.
 */
export function validateEnv() {
  const errors   = [];
  const warnings = [];

  for (const rule of ENV_RULES) {
    // Verifica se a regra é aplicável ao contexto atual
    if (rule.condition && !rule.condition()) continue;

    const value = process.env[rule.key];
    const missing = value === undefined || value.trim() === "";

    if (missing && rule.required) {
      errors.push({ key: rule.key, hint: rule.hint });
    } else if (missing && !rule.required) {
      warnings.push({ key: rule.key, hint: rule.hint });
    }
  }

  // ─── IMPRIMIR WARNINGS (não bloqueante) ─────────────────────────────
  if (warnings.length > 0) {
    console.warn(`\n${YELLOW}${BOLD}[ENV] ⚠  ${warnings.length} variável(is) opcional(is) não configurada(s):${RESET}`);
    for (const w of warnings) {
      console.warn(`  ${YELLOW}→ ${w.key}${RESET}: ${w.hint}`);
    }
    console.warn();
  }

  // ─── IMPRIMIR ERRORS E TRAVAR O BOOT ────────────────────────────────
  if (errors.length > 0) {
    console.error(`\n${RED}${BOLD}[ENV] ✖  ERRO CRÍTICO — ${errors.length} variável(is) obrigatória(s) ausente(s):${RESET}`);
    for (const e of errors) {
      console.error(`  ${RED}✖ ${e.key}${RESET}: ${e.hint}`);
    }
    console.error(`\n${RED}${BOLD}  >> Corrija o seu arquivo .env ou as variáveis do Docker antes de iniciar.${RESET}\n`);
    process.exit(1);
  }

  // ─── BOOT APROVADO ──────────────────────────────────────────────────
  const mode = process.env.USE_OPENAI === "true" ? "Cloud (OpenAI)" : "Local Privado (Ollama)";
  console.log(`${CYAN}[ENV] ✔  Ambiente validado. Motor de IA: ${BOLD}${mode}${RESET}`);
}
