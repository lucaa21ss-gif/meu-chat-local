---
name: arquitetura
description: Skill especializada para analisar, documentar e guiar a arquitetura do projeto meu-chat-local.
---
# Arquitetura (Architecture)

## Instruções
Esta skill deve ser usada para entender a organização técnica do projeto, identificar padrões e garantir que novas implementações sigam a arquitetura estabelecida.

1. **Mapeamento de Estrutura**: Ao ser acionada, analise a árvore de diretórios para identificar os componentes principais (Frontend, Backend, Infraestrutura).
2. **Identificação de Papéis**: Explique o que cada diretório faz e como os arquivos se relacionam (ex: `web/` contém a SPA React/Vite, `server/` contém a API Express).
3. **Análise de Fluxo de Dados**: Descreva como os dados fluem do frontend para o backend e onde são armazenados (ex: PostgreSQL, Ollama).
4. **Guia de Implementação**: Ao sugerir mudanças, indique exatamente onde os novos arquivos devem ser criados e quais arquivos existentes devem ser modificados para manter a consistência arquitetural.
5. **Documentação Visual**: Utilize diagramas Mermaid para representar visualmente a arquitetura do sistema sempre que solicitado ou quando a complexidade exigir.

## Melhores Práticas
- **Mantenha a Separação de Responsabilidades**: Garanta que lógica de negócio, interface e acesso a dados permaneçam desacoplados.
- **Siga os Padrões Existentes**: Antes de propor uma nova pasta ou biblioteca, verifique se já existe um padrão similar no projeto.
- **Documente Decisões**: SEMPRE explique o "porquê" de uma decisão arquitetural, não apenas o "o quê".
- **Use Nomes Semânticos**: Mantenha a nomenclatura de arquivos e pastas consistente com o resto do sistema.

## Recursos
- `web/`: Frontend React/Vite.
- `server/`: Backend Node.js/Express.
- `ollama/`: Integração com modelos de linguagem locais.
- `postgres/`: Configurações de banco de dados.
