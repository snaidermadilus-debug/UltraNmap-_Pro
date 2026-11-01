# Ultra Nmap Pro

Painel web mobile-first profissional para execução, acompanhamento e análise de auditorias Nmap em ambiente local e Termux/Android.

O projeto fornece uma interface gráfica interativa para iniciar auditorias reais, acompanhar jobs em tempo real com radar visual e cronômetro, consultar histórico persistente e analisar diagnósticos humanos e técnicos.

> **Uso responsável:** utilize o Ultra Nmap Pro somente em dispositivos, redes e sistemas para os quais você tenha autorização explícita para realizar auditorias.

---

## ✨ Principais Recursos

- **Interface Mobile-First Modernizada**: Projetada para telas pequenas (360px a 430px+) com visual estilo NOC / Security Dashboard.
- **Acompanhamento Visual com Radar Animado**: Componente de progresso em tempo real (`ScanProgress.tsx`) com pulso e varredura radar.
- **Mensagens Dinâmicas Sem Porcentagem Falsa**: Indicadores indeterminados de atividade alternando mensagens reais do processo.
- **Cronômetro Preciso de Execução**: Baseado em `start_time` (quando o Nmap inicia) e `end_time` (quando o Nmap termina), desconsiderando o tempo em fila.
- **Fila Determinística de Scans**: Suporte a até 2 exoluções simultâneas (`MAX_CONCURRENT_SCANS = 2`), iniciando novos jobs automaticamente assim que vagas são liberadas.
- **Estados de Execução Reais**:
  - `queued`: Preparando auditoria / aguardando vaga na fila.
  - `running`: Scanner ativo com Nmap em execução.
  - `completed`: Auditoria finalizada e dados processados.
  - `failed`: Falha na execução técnica do comando.
  - `cancelled`: Processo encerrado a pedido do usuário.
- **Cancelamento Real**: Envio de sinal `SIGKILL` ao processo filho Nmap com liberação imediata da vaga na fila.
- **Descoberta Dinâmica da Rede Local**: Detecção automática de IPv4, interface, gateway padrão e CIDR real (`192.168.0.0/24`, `10.0.0.0/24`, `172.16.0.0/16`, etc.) sem suposições rígidas.
- **Probe Web Pós-Processamento (`webProbe.ts`)**: Identifica e testa automaticamente portas HTTP/HTTPS abertas uma única vez ao término da auditoria.
- **Execução Segura Nmap**: Utilização de `spawn()` com argumentos estruturados em array para prevenir Injeção de Comandos Shell.
- **Persistência Local e Histórico**: Armazenamento com fila de escrita atômica para integridade do banco JSON.

---

## 🧱 Arquitetura e Fluxo de Dados

```text
Navegador (React SPA)
   │
   ▼
API Express (server.ts)
   │
   ▼
Gerenciador de Fila / Jobs (scanner.ts)
   │
   ▼
Processo Nmap (spawn)
   │
   ├── stdout (XML) ──► Parser (parser.ts)
   └── stderr      ──► Registro de Erro
         │
         ▼
Probe Web (webProbe.ts) [Pós-processamento único para portas HTTP/S]
         │
         ▼
Persistência (data/db.json)
```

---

## 📁 Estrutura do Projeto

```text
ultra-nmap-pro/
├── package.json
├── tsconfig.json
├── server.ts
├── data/
│   └── db.json
├── src/
│   ├── App.tsx
│   ├── db/
│   │   └── db.ts
│   ├── scanner/
│   │   ├── scanner.ts
│   │   ├── parser.ts
│   │   └── webProbe.ts
│   └── components/
│       ├── Dashboard.tsx
│       ├── Scanner.tsx
│       ├── Executions.tsx
│       ├── History.tsx
│       ├── ScanDetails.tsx
│       ├── ScanProgress.tsx
│       ├── NetworkDiscovery.tsx
│       ├── Logs.tsx
│       └── Navigation.tsx
└── README.md
```

---

## 🔍 Perfis de Auditoria Nmap

O backend disponibiliza perfis com argumentos estruturados e seguros:

| Perfil | Comando Nmap Equivalente | Descrição |
|---|---|---|
| `discovery` | `nmap -sn <alvo> -oX -` | Descoberta de hosts ativos via ARP/ICMP/Ping. |
| `fast` | `nmap -Pn -F <alvo> -oX -` | Verificação rápida das 100 portas mais críticas. |
| `common` | `nmap -Pn --top-ports 100 <alvo> -oX -` | Análise das 100 principais portas TCP. |
| `top1000` | `nmap -Pn --top-ports 1000 <alvo> -oX -` | Varredura das 1000 portas TCP mais frequentes. |
| `all` | `nmap -Pn -p- <alvo> -oX -` | Análise completa das 65.535 portas TCP. |
| `services` | `nmap -Pn -sV <alvo> -oX -` | Detecção de versões exatas dos serviços. |
| `web` | `nmap -Pn -p 80,443,8080... -sV <alvo> -oX -` | Focado em servidores web e portas HTTP/S. |
| `os` | `nmap -Pn -O <alvo> -oX -` | Detecção de Sistema Operacional. |
| `udp` | `nmap -Pn -sU -p 53,123,161... <alvo> -oX -` | Varredura em portas UDP essenciais. |

---

## 🚀 Como Executar

### 1. Requisitos
- **Node.js**: v18 ou superior
- **Nmap**: Instalado e acessível no PATH do sistema (`pkg install nmap` no Termux)

### 2. Instalação e Execução

```bash
# Instalar dependências
npm install

# Iniciar servidor em modo de desenvolvimento
npm run dev

# Ou gerar build e iniciar modo produção
npm run build
npm start
```

O servidor estará disponível em: `http://localhost:3000` ou no IP local detectado.

---

## 🛑 Garantias de Qualidade e Segurança

- **Zero Injeção de Shell**: Parâmetros de alvo passam por validação Regex estrita de IPv4/CIDR/Hostname e são repassados de forma isolada ao `spawn()`.
- **Sem Mocks no Scanner**: Resultados e estados refletem fielmente a execução do binário Nmap no sistema operacional.
- **Probe Web Eficiente**: Requisições de probe HTTP/HTTPS são disparadas **apenas uma vez** após a conclusão do scan, evitando flood ou requisições desnecessárias a cada polling da API.
