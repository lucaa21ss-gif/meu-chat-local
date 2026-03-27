---
name: local-first
version: 1.1.0
description: 'Guia de contexto para sistemas local-first: automação sem nuvem, privacidade de dados, processamento local, integração de dispositivos e resiliência offline. Use quando: projetar arquitetura sem dependência de cloud, implementar automação local, garantir privacidade dos dados, integrar dispositivos heterogêneos, configurar Home Assistant, processar dados de sensores localmente, armazenar histórico de eventos sem serviços externos.'
lastReviewed: 2026-03-27
---

# Sistemas Local-First: Guia de Contexto

## Proposito
Fornecer diretrizes praticas para projetar e operar sistemas local-first com foco em privacidade, resiliência offline e previsibilidade de latencia.

## Escopo
- Inclui arquitetura local sem dependencia obrigatoria de cloud.
- Inclui automacao com Home Assistant, Node-RED, MQTT e inferencia local.
- Inclui boas praticas de seguranca de rede e armazenamento local.
- Inclui orientacoes de hardware e anti-padroes operacionais.
- Exclui recomendacoes que dependam de processamento externo como requisito de funcionamento.

## Instrucoes
1. Validar primeiro os requisitos de privacidade e operacao offline do cenario.
2. Definir arquitetura base local (automacao, mensageria, armazenamento e inferencia).
3. Priorizar integracoes abertas e protocolos locais para evitar lock-in de fabricante.
4. Aplicar segmentacao de rede, autenticacao forte e trilha de auditoria local.
5. Dimensionar hardware conforme carga de trabalho (automacao, visao computacional e LLM).
6. Revisar anti-padroes para evitar dependencia involuntaria de cloud.

## Melhores Praticas
- Tratar internet como opcional para atualizacoes, nao como dependencia de runtime.
- Medir latencia ponta a ponta e manter metas claras para automacoes criticas.
- Garantir persistencia em SSD/HDD e evitar SD card em carga continua.
- Padronizar telemetria e logs locais para facilitar troubleshooting.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias (Proposito, Escopo, Instrucoes, Melhores Praticas, Validacao) estao presentes.
- O conteudo reforca operacao local sem dependencia mandatória de cloud.
- O guia inclui seguranca, resiliencia, hardware e anti-padroes.

## Quando Usar Esta Skill

- Projetar ou revisar arquiteturas que não dependem de nuvem
- Implementar automação residencial/empresarial com privacidade
- Garantir funcionamento offline sem degradação crítica
- Integrar dispositivos de múltiplas marcas em interface unificada
- Processar dados de sensores, câmeras ou voz localmente
- Armazenar históricos sem expor dados a terceiros

---

## Princípios Fundamentais

### 1. Dados Nunca Saem da Rede Local
- Todo processamento acontece no hardware local (NAS, mini PC, Raspberry Pi, servidor doméstico)
- Sem chamadas externas para inferência, armazenamento ou análise
- Sincronização entre dispositivos via rede local (LAN/VLAN), não via cloud relay

### 2. Resiliência Offline
- O sistema deve funcionar **completamente** sem internet
- Internet serve apenas para atualizações opcionais e acesso remoto VPN
- Filas locais absorvem eventos quando componentes estão temporariamente indisponíveis

### 3. Latência Previsível
- Local processing elimina RTT para servidores externos (~< 10ms vs > 200ms cloud)
- Comandos de voz e automações devem responder em < 500ms localmente

---

## Componentes de Referência

### Orquestração e Automação
| Ferramenta | Papel |
|---|---|
| **Home Assistant** | Plataforma central de automação, integra > 3000 dispositivos |
| **Node-RED** | Fluxos visuais de automação e processamento de eventos |
| **MQTT (Mosquitto)** | Barramento de mensagens leve para sensores e atuadores |

### Processamento de Linguagem Natural (Local)
| Ferramenta | Papel |
|---|---|
| **Ollama** | Serve LLMs localmente via API HTTP compatível com OpenAI |
| **Whisper** | STT (speech-to-text) offline, múltiplos idiomas |
| **Piper / Coqui** | TTS (text-to-speech) offline em pt-BR |
| **Wyoming Protocol** | Integra Whisper/Piper ao Home Assistant |

### Armazenamento Local
| Ferramenta | Papel |
|---|---|
| **InfluxDB / TimescaleDB** | Séries temporais para sensores e telemetria |
| **SQLite** | Banco leve para dados relacionais de automação |
| **MinIO** | Object storage S3-compatible local (câmeras, arquivos) |
| **Frigate** | NVR com detecção de objetos por IA local (requer GPU/Coral) |

---

## Padrões de Arquitetura

### Integração de Dispositivos Heterogêneos
```
Dispositivos → Protocolo Nativo → Conector/Bridge → MQTT → Home Assistant
  (Zigbee) →    zigbee2mqtt   →     Broker       →  HA
  (Z-Wave) →    ZWaveJS2MQTT  →     Broker       →  HA
  (Wi-Fi)  →    ESPHome       →     Broker       →  HA
  (KNX)    →    KNX-connector →     Broker       →  HA
```

### Processamento de Voz Local
```
Microfone → Whisper (STT) → LLM local (Ollama) → Piper (TTS) → Alto-falante
                              ↓
                        Home Assistant API (ações)
```

### Câmeras sem Nuvem
```
Câmera IP (RTSP) → Frigate → Detecção local → Evento MQTT → Home Assistant
                     ↓
               Gravação local (MinIO/NFS)
```

---

## Segurança Local

- **Sem exposição direta à internet**: use Tailscale VPN ou WireGuard para acesso remoto
- **Certificados TLS internos**: use Caddy ou Let's Encrypt com DNS challenge (sem abrir portas)
- **Segmentação de rede**: IoT em VLAN separada, sem acesso à rede principal
- **Autenticação**: tokens longos ou mTLS para comunicação entre serviços internos
- **Auditoria**: todos os eventos de automação registrados localmente com timestamp

---

## Considerações de Hardware

| Carga | Hardware Mínimo |
|---|---|
| Home Assistant + MQTT | Raspberry Pi 4 (4GB) ou N100 mini PC |
| LLM local (7B params) | CPU: 8GB+ RAM; GPU: 6GB VRAM (RTX 3060) |
| Câmeras com IA (Frigate) | Coral TPU USB ou GPU NVIDIA |
| Stack completo | Intel N100/N305 com 16GB RAM ou servidor com GPU |

---

## Anti-Padrões a Evitar

- **Cloud como fallback obrigatório**: se o sistema para sem internet, não é local-first
- **Credenciais em cloud relay**: evite soluções que exigem conta no servidor do fabricante
- **Dispositivos com firmware fechado**: prefira ESPHome, Tasmota ou similares open-source
- **Único ponto de falha**: distribua responsabilidades (ex: HA separado do broker MQTT)
- **Storage em SD card**: SD cards falham; use SSD ou HDD para dados persistentes

## Recursos
- Home Assistant: https://www.home-assistant.io/
- Node-RED: https://nodered.org/
- Eclipse Mosquitto (MQTT): https://mosquitto.org/
- Ollama: https://docs.ollama.com/
