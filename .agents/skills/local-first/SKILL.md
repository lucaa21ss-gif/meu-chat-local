---
name: local-first
description: 'Guia de contexto para sistemas local-first: automação sem nuvem, privacidade de dados, processamento local, integração de dispositivos e resiliência offline. Use quando: projetar arquitetura sem dependência de cloud, implementar automação local, garantir privacidade dos dados, integrar dispositivos heterogêneos, configurar Home Assistant, processar dados de sensores localmente, armazenar histórico de eventos sem serviços externos.'
---

# Sistemas Local-First: Guia de Contexto

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
