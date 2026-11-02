# Ultra Nmap Pro

Painel web mobile-first profissional para execução, acompanhamento e análise de auditorias Nmap em ambiente local, Linux e Termux/Android.

O projeto fornece uma interface gráfica interativa para iniciar auditorias reais, acompanhar jobs em tempo real com radar visual e cronômetro, consultar histórico persistente e analisar diagnósticos humanos e técnicos.

> **Uso responsável:** utilize o Ultra Nmap Pro somente em dispositivos, redes e sistemas para os quais você tenha autorização explícita para realizar auditorias.

---

## ✨ Principais Recursos

- **Interface Mobile-First Modernizada**: Projetada para telas pequenas (360px a 430px+) com visual estilo NOC / Security Dashboard.
- **Acompanhamento Visual com Radar Animado**: Componente de progresso em tempo real (`ScanProgress.tsx`) com pulso e varredura radar.
- **Cronômetro Preciso de Execução**: Baseado no tempo de início real do processo Nmap, desconsiderando tempo de fila.
- **Fila Determinística de Scans**: Suporte a até 2 execuções simultâneas (`MAX_CONCURRENT_SCANS = 2`), iniciando novos jobs automaticamente assim que vagas são liberadas.
- **Cancelamento e Isolação de Processos**: Envio de sinal `SIGKILL` ao grupo de processos (`process.kill(-pid, 'SIGKILL')`) garantindo que filhos não fiquem órfãos.
- **Descoberta Dinâmica de Rede**: Cálculo bitwise exato de CIDR para qualquer prefixo IPv4 (`/8` a `/32`) via comandos `ip` (JSON e texto puro) e `os.networkInterfaces()`.
- **Probe Web Eficiente**: Executado **uma única vez** no término do scan para identificar servidores HTTP/HTTPS ativos com indicação de `tlsValid` e `bodyTruncated`.
- **Persistência Limpa**: Resumo estruturado armazenado em `data/db.json` com saídas brutas em arquivos `.xml` isolados em `data/outputs/`.
- **Segurança Reforçada**: Prevenção de Path Traversal, sanitização de entrada com Regex e autenticação opcional via token de API.

---

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `HOST` | `127.0.0.1` | Endereço de escuta do servidor HTTP Express. |
| `PORT` | `3000` | Porta TCP do servidor Express. |
| `ULTRA_DATA_DIR` | `data` | Diretório onde são gravados `db.json` e a pasta `outputs/`. |
| `ULTRA_API_TOKEN` | *Nenhum* | Token opcional. Se configurado, exige header `x-api-token` ou `Authorization: Bearer <token>` em `/api/*`. |
| `ULTRA_USE_MOCK_NMAP` | `0` | Se definido como `1` em desenvolvimento, anexa o mock do Nmap ao final do `PATH`. |

---

## 🚀 Como Executar

### 1. Requisitos
- **Node.js**: `>=20.19.0`
- **Nmap**: Instalado e acessível no `PATH` do sistema (`pkg install nmap` no Termux / `apt install nmap` no Linux)

### 2. Comandos do Projeto

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento (servidor Express + Vite SPA)
npm run dev

# Checagem de tipos TypeScript
npm run typecheck

# Executar suíte de testes automatizados
npm test

# Gerar build de produção do frontend
npm run build

# Iniciar servidor em modo produção (exige npm run build prévio)
npm start
```

O servidor estará disponível por padrão em `http://127.0.0.1:3000`.

---

## 🛑 Garantias de Qualidade e Segurança

- **Zero Injeção de Shell**: Argumentos repassados em array ao `spawn()` com checagem de alvos e portas por regex.
- **Proteção de Leitura de Arquivos**: Endpoints de arquivos brutos utilizam `resolveOutputPath()` e `JOB_ID_REGEX` para barrar ataques de Path Traversal.
- **Execução Somente Leitura nos GETs**: As rotas `GET /api/scans/:id` consultam dados em memória sem reexecutar varreduras de rede.