---
description: Uma meta-skill que cria novas skills customizadas para o agente com base nos requisitos do usuário.
---
# Criador de Skills (Skill Creator)

## Propósito
Esta skill foi desenhada para criar novas skills(habilidades) de forma automatizada e com as melhores práticas dentro do projeto atual para o agente.

## Instruções
Sempre que o usuário solicitar a criação de uma nova skill, siga as etapas abaixo:
1. **Entenda os Requisitos**: Identifique o propósito, o escopo e as instruções específicas para a skill solicitada. Peça maiores detalhes ao usuário se a solicitação for vaga.
2. **Crie a Pasta**: Crie um novo diretório para a skill no caminho `.agents/skills/<novo-nome-da-skill>/` dentro deste workspace. Utilize formato kebab-case para o nome da pasta (ex: `minha-nova-skill`).
3. **Gere o arquivo `SKILL.md`**: Crie um arquivo chamado `SKILL.md` dentro do diretório que acabou de ser criado.
4. **Preencha o Conteúdo**: O arquivo `SKILL.md` obrigatoriamente deve conter:
   - Uma seção *frontmatter* yaml (opcional, porém recomendada) contendo `name` e `description`.
   - Um título principal (ex: `# Nome da Skill`).
   - Uma seção `## Instruções` (Instructions) que forneça um passo a passo claro que outro agente possa seguir para realizar a tarefa relacionada a skill.
   - Uma seção `## Melhores Práticas` (Best Practices) listando convenções, o que fazer, o que não fazer e dicas de segurança.
   - Uma seção opcional `## Recursos` (Resources) caso a skill espere scripts ou templates adicionais.
5. **Finalização**: Notifique o usuário de que a skill foi criada e está pronta para uso e mostre o resumo do que foi construído.

## Melhores Práticas
- Garanta que o nome das pastas sempre utilize padrão kebab-case apenas com letras minúsculas.
- Escreva as instruções dentro das skills como sendo direcionadas a um AI Agent que precisa ser extremamente literal.
- Se for necessário muito código associado à skill, indique ao usuário que é possível utilizar a pasta `scripts/` dentro da skill.
