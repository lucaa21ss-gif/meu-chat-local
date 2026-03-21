# Changelog

## [0.3.0](https://github.com/lucaa21ss-gif/meu-chat-local/compare/meu-chat-local-v0.2.1...meu-chat-local-v0.3.0) (2026-03-21)


### Features

* **#52:** backpressure e fila local para operacoes custosas ([12bd6f5](https://github.com/lucaa21ss-gif/meu-chat-local/commit/12bd6f50f3a1db934abeaf226a22c53cb0f410fc))
* **#53:** baseline de configuracao e deteccao de drift ([2f61957](https://github.com/lucaa21ss-gif/meu-chat-local/commit/2f61957af6e8982ddb3a4127fc4491056655ae5b))
* **#54:** aprovacao auditavel para acoes operacionais criticas ([49c6faa](https://github.com/lucaa21ss-gif/meu-chat-local/commit/49c6faacb61f94ecb894f29df84c3b112f6e89dd))
* **#55:** scorecard operacional consolidado ([bf3b46f](https://github.com/lucaa21ss-gif/meu-chat-local/commit/bf3b46f7d67086cdac4dedbe5645067de8ac1baf))
* **#57:** persistir preferencias de UI por perfil ([b4ff719](https://github.com/lucaa21ss-gif/meu-chat-local/commit/b4ff7191d4aaf970d10112bf128ce039a499ef11))
* **#59:** adicionar atalhos globais na interface ([15cba5f](https://github.com/lucaa21ss-gif/meu-chat-local/commit/15cba5f72305768007bca707c92c8fd2aca2ae2a))
* **#61:** paginar e buscar chats no sidebar ([00a5410](https://github.com/lucaa21ss-gif/meu-chat-local/commit/00a541008f2b8dbd6b27be8b0aea8c8d2fb49f27))
* **#63:** exportacao markdown e copia rapida ([60d9e6e](https://github.com/lucaa21ss-gif/meu-chat-local/commit/60d9e6e8a5efdf77574e90c26419a862574b012a))
* **#65:** indicadores visuais de saude na UI ([432c128](https://github.com/lucaa21ss-gif/meu-chat-local/commit/432c1288889c3bcb17f1e5e3f72424bcf9ea465d))
* adicionar novas rotas de auto-healing, integridade e recuperação de desastres; refatorar busca de mensagens e melhorar a formatação de datas ([3c9e41a](https://github.com/lucaa21ss-gif/meu-chat-local/commit/3c9e41a713abd9dd6bd0c3980817ac4162f3d136))
* **audit:** adicionar auditoria local com filtros e export ([66f3845](https://github.com/lucaa21ss-gif/meu-chat-local/commit/66f3845609072eaf7637933c2623160611ca0065))
* **backup:** criptografia opcional por passphrase ([d7ec97b](https://github.com/lucaa21ss-gif/meu-chat-local/commit/d7ec97b9df427994a4ec7e404296b453884dd345))
* **backup:** exportar e restaurar backup completo ([da63869](https://github.com/lucaa21ss-gif/meu-chat-local/commit/da63869dd90c35d9512305e77d3bd4a7d241be54))
* **chats:** favoritos, tags, arquivamento e telemetria opt-in ([#8](https://github.com/lucaa21ss-gif/meu-chat-local/issues/8) [#5](https://github.com/lucaa21ss-gif/meu-chat-local/issues/5)) ([96a7aa5](https://github.com/lucaa21ss-gif/meu-chat-local/commit/96a7aa591e4dd605154e36e3d9093bf5b8779277))
* **chats:** importacao/exportacao JSON por conversa e em lote ([#22](https://github.com/lucaa21ss-gif/meu-chat-local/issues/22)) ([b8ec1d0](https://github.com/lucaa21ss-gif/meu-chat-local/commit/b8ec1d04a6019b26b31dc9e56c5368062de509d8))
* **config:** versionamento e rollback de configuracoes ([06b7089](https://github.com/lucaa21ss-gif/meu-chat-local/commit/06b708983d6b7beec3bef4a21b72745d77076da8))
* **db:** adicionar migrations versionadas no SQLite ([3ed6adc](https://github.com/lucaa21ss-gif/meu-chat-local/commit/3ed6adc285d3d05572a67fbbbbeded69ae2c492a))
* **dist:** empacotamento e scripts de instalacao ([#16](https://github.com/lucaa21ss-gif/meu-chat-local/issues/16)) ([05c595c](https://github.com/lucaa21ss-gif/meu-chat-local/commit/05c595c9719a7d6ef879b4e18e7e7fe3e1d9d92c))
* **health:** expandir painel e checks operacionais ([3163ce8](https://github.com/lucaa21ss-gif/meu-chat-local/commit/3163ce89b0ae76ef6f4e0d72feaa78df8cd940c8))
* **health:** GET /api/health, retry backoff e badge de status Ollama ([#21](https://github.com/lucaa21ss-gif/meu-chat-local/issues/21)) ([fc02b17](https://github.com/lucaa21ss-gif/meu-chat-local/commit/fc02b171d03777f64ecd0b1325719cfac449afff))
* **incident:** runbook executavel com auditoria e rollback ([809a204](https://github.com/lucaa21ss-gif/meu-chat-local/commit/809a20438776712ec4078da9039ffdcaa25e36c3))
* **observability:** traceId ponta-a-ponta e pacote de diagnostico ([f572724](https://github.com/lucaa21ss-gif/meu-chat-local/commit/f5727247653f82419d2c9136da6a4aee0d3f923f))
* **onboarding:** adicionar wizard inicial de configuracao ([ababbbc](https://github.com/lucaa21ss-gif/meu-chat-local/commit/ababbbc8518996077038e2f13d609ae688cb5f0c))
* pacote de diagnostico forense e triagem ([#40](https://github.com/lucaa21ss-gif/meu-chat-local/issues/40)) ([a71ad68](https://github.com/lucaa21ss-gif/meu-chat-local/commit/a71ad6840ec0fa32374334ecf478c329987340b3))
* **perf:** adiciona perfil local de capacidade ([ce24663](https://github.com/lucaa21ss-gif/meu-chat-local/commit/ce246635102687dc431669e0f0e04119fc992479))
* plano operacional de resposta a incidentes ([#43](https://github.com/lucaa21ss-gif/meu-chat-local/issues/43)) ([eac1530](https://github.com/lucaa21ss-gif/meu-chat-local/commit/eac1530eb4265d10cef639229ad794fe1ac5baf9))
* **product:** adiciona pagina e guia de usuario ([#17](https://github.com/lucaa21ss-gif/meu-chat-local/issues/17)) ([20ca018](https://github.com/lucaa21ss-gif/meu-chat-local/commit/20ca018f81d1bfbf57038d24c5b29119fa547e8b))
* **prompt:** system prompt por conversa e perfil (schema v6) ([#23](https://github.com/lucaa21ss-gif/meu-chat-local/issues/23)) ([ab5e165](https://github.com/lucaa21ss-gif/meu-chat-local/commit/ab5e165ea0b1ba5ecd2346d890999f6fe6f5bfc3))
* **rag:** upload local de docs e citacoes no chat ([#18](https://github.com/lucaa21ss-gif/meu-chat-local/issues/18)) ([7c15450](https://github.com/lucaa21ss-gif/meu-chat-local/commit/7c154500de6de379f0258cba4f7fd62b95344ab6))
* **rate-limit:** rate limiting e fila de requisicoes por perfil ([334d4ab](https://github.com/lucaa21ss-gif/meu-chat-local/commit/334d4ab77210bc4ac7f8f2965c8b7a0c453a3ce0))
* **rbac:** controle de acesso por papel de usuario ([dbef371](https://github.com/lucaa21ss-gif/meu-chat-local/commit/dbef371b2ba21cc3b0fe02e4b7ea07f5e3e24edc))
* **recovery:** teste automatizado de restauracao de desastre ([5cc8c27](https://github.com/lucaa21ss-gif/meu-chat-local/commit/5cc8c276e4e8fbcdb1402a659eedc48d61bdd4e4))
* **release:** canary local com gate de promocao ([47490bd](https://github.com/lucaa21ss-gif/meu-chat-local/commit/47490bdf4fb3a3cab29253ab54fa69126afd6d6a))
* **reliability:** auto-healing local com circuito de seguranca ([2c19972](https://github.com/lucaa21ss-gif/meu-chat-local/commit/2c199722a23d0eea6c9336ca87fc0f0c17ce314e))
* **resilience:** fallback, retry e timeout no chat Ollama ([b7a7212](https://github.com/lucaa21ss-gif/meu-chat-local/commit/b7a7212dafea4f85cb0a9b188d2991c3359afa6a))
* retencao inteligente e rotacao segura de backups ([#42](https://github.com/lucaa21ss-gif/meu-chat-local/issues/42)) ([a19c310](https://github.com/lucaa21ss-gif/meu-chat-local/commit/a19c3108788cb159a9e383241a897d479beed6d6))
* **search:** filtros e paginacao na busca de historico ([#7](https://github.com/lucaa21ss-gif/meu-chat-local/issues/7)) ([a1f2eb7](https://github.com/lucaa21ss-gif/meu-chat-local/commit/a1f2eb7ba3fbf23588080ba86d29b70fe0ff4ad0))
* **security:** hardening local com validacoes e secret scan ([59de239](https://github.com/lucaa21ss-gif/meu-chat-local/commit/59de239949051660ed130768fd4e6ddb20659cb4))
* **security:** observabilidade de integridade em runtime ([92ebab7](https://github.com/lucaa21ss-gif/meu-chat-local/commit/92ebab7e177775681bc47861b2252914e9f4b51e))
* **slo:** snapshot local e painel de confiabilidade ([b480460](https://github.com/lucaa21ss-gif/meu-chat-local/commit/b480460433a29121e167c4fcf9c1e43a8295e7d8))
* **storage:** adicionar retencao e limpeza local por perfil ([9a448ba](https://github.com/lucaa21ss-gif/meu-chat-local/commit/9a448ba8581ca4bfaab69a55ede4d3b6ca73e6bd))
* suite de caos local com relatorio por cenario ([#44](https://github.com/lucaa21ss-gif/meu-chat-local/issues/44)) ([1a5042e](https://github.com/lucaa21ss-gif/meu-chat-local/commit/1a5042ed498e059fa3a193fae49b9837b1a20c51))
* supply chain hardening com sbom e assinatura ([#45](https://github.com/lucaa21ss-gif/meu-chat-local/issues/45)) ([600e2bb](https://github.com/lucaa21ss-gif/meu-chat-local/commit/600e2bbd9ff4787820bd7fb49fad383669b492d4))
* **theme:** adicionar tema claro/escuro/sistema por perfil ([ada1561](https://github.com/lucaa21ss-gif/meu-chat-local/commit/ada15610cec5e482b0e4d6596b4835ab272ef399))
* **ui:** melhorar feedback de erro e acao de tentar novamente ([185fb37](https://github.com/lucaa21ss-gif/meu-chat-local/commit/185fb37c15c3c7227163fe5697b5ebf809468d11))
* **ui:** modal de ajuda para atalhos globais ([#24](https://github.com/lucaa21ss-gif/meu-chat-local/issues/24)) ([268e840](https://github.com/lucaa21ss-gif/meu-chat-local/commit/268e840508b487bdb7b074bf8c3b96aa793eb8ee))
* **upload:** politicas rigorosas e auditoria de bloqueios ([dd78172](https://github.com/lucaa21ss-gif/meu-chat-local/commit/dd78172b02c0c60daa40343afe7e2a5d33cacf83))
* **users:** perfis e isolamento por usuario ([#19](https://github.com/lucaa21ss-gif/meu-chat-local/issues/19)) ([b488511](https://github.com/lucaa21ss-gif/meu-chat-local/commit/b48851132724eba5f6ed6b87ad3d9ac9754ebcdd))
* validacao continua de backup e restore ([#41](https://github.com/lucaa21ss-gif/meu-chat-local/issues/41)) ([2f3b376](https://github.com/lucaa21ss-gif/meu-chat-local/commit/2f3b376809c1faa40a95b0b910af2f4d907017c6))
* **web:** preparar UI para status, voz e onboarding ([83b7755](https://github.com/lucaa21ss-gif/meu-chat-local/commit/83b7755d8e4c4dbc164a2222d2887ef1a2c5e596))

## [0.2.1](https://github.com/lucaa21ss-gif/meu-chat-local/compare/meu-chat-local-v0.2.0...meu-chat-local-v0.2.1) (2026-03-16)


### Bug Fixes

* **ci,publish:** corrigir changelog e dispatch por tag ([76a5d3c](https://github.com/lucaa21ss-gif/meu-chat-local/commit/76a5d3c67b098d52d55deae6f5fc1bda1c266def))

## [0.2.0](https://github.com/lucaa21ss-gif/meu-chat-local/compare/meu-chat-local-v0.1.0...meu-chat-local-v0.2.0) (2026-03-16)

### Features

- **branding:** adicionar identidade visual oficial ([03aba0b](https://github.com/lucaa21ss-gif/meu-chat-local/commit/03aba0be721a541851c1431e6fb26dea098a833f))
- **server:** endurecer runtime e operacao ([9e60d33](https://github.com/lucaa21ss-gif/meu-chat-local/commit/9e60d3340e926fed42faa0108a40eea0f87eefeb))

### Bug Fixes

- **ci:** evitar travamento de testes por pino-pretty ([c69ef23](https://github.com/lucaa21ss-gif/meu-chat-local/commit/c69ef2311eb7dcaba540d7e742dc40c864e85eb5))

### Performance Improvements

- **sprint5:** logging, compression e cache headers ([f089ff2](https://github.com/lucaa21ss-gif/meu-chat-local/commit/f089ff2cadd1557e573e2a9b2d1aecb24862bdb1))
