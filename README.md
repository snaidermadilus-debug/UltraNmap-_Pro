# Ultra Nmap Pro

Painel web mobile-first profissional para execução, acompanhamento e análise de auditorias Nmap em ambiente local, Linux, servidores cloud e dispositivos Android via Termux.

O projeto fornece uma interface gráfica interativa avançada para iniciar auditorias reais, acompanhar jobs em tempo real com radar visual e cronômetro, consultar histórico persistente e analisar diagnósticos humanos e técnicos.

> **Uso responsável:** Utilize o Ultra Nmap Pro somente em dispositivos, redes e sistemas para os quais você possui autorização explícita e legal para realizar testes de penetração e auditorias de segurança.

---

## 📋 Sumário
1. [Apresentação do Projeto](#1-apresentação-do-projeto)
2. [Recursos](#2-recursos)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura de Diretórios Atualizada](#4-estrutura-de-diretórios-atualizada)
5. [Requisitos Reais](#5-requisitos-reais)
6. [Versões Mínimas Corretas](#6-versões-mínimas-corretas)
7. [Instalação no Android / Termux](#7-instalação-no-android--termux)
8. [Instalação no Linux](#8-instalação-no-linux)
9. [Instalação no Windows](#9-instalação-no-windows)
10. [Instalação das Dependências](#10-instalação-das-dependências)
11. [Instalação do Nmap](#11-instalação-do-nmap)
12. [Inicialização em Desenvolvimento](#12-inicialização-em-desenvolvimento)
13. [Compilação para Produção](#13-compilação-para-produção)
14. [Inicialização em Produção](#14-inicialização-em-produção)
15. [Endereço de Acesso](#15-endereço-de-acesso)
16. [Configuração de HOST e PORT](#16-configuração-de-host-e-port)
17. [Configuração de Autenticação](#17-configuração-de-autenticação)
18. [Solução de Erros Comuns](#18-solução-de-erros-comuns)
19. [Execução dos Testes](#19-execução-dos-testes)
20. [Limitações Conhecidas](#20-limitações-conhecidas)

---

## 1. Apresentação do Projeto
O **Ultra Nmap Pro** é uma solução Full-Stack robusta projetada para administradores de rede, analistas de segurança e entusiastas de auditoria de redes que precisam de uma ferramenta ágil, segura e altamente responsiva. Capaz de rodar nativamente em servidores Linux ou localmente em smartphones Android via Termux, ele faz a ponte entre o motor poderoso do Nmap (`nmap`) e uma interface moderna construída com React, TypeScript, Tailwind CSS e Express.

## 2. Recursos
- **Interface Mobile-First Modernizada**: Projetada para telas compactas e desktops com visual NOC / Security Dashboard.
- **Acompanhamento Visual com Radar Animado**: Componentes interativos de progresso em tempo real com indicador de pulso e varredura radar.
- **Cronômetro Preciso de Execução**: Baseado no tempo de início real do processo Nmap, descontando o tempo de fila.
- **Fila Determinística de Scans**: Gerenciamento de até 2 execuções simultâneas (`MAX_CONCURRENT_SCANS = 2`), iniciando novos jobs automaticamente.
- **Cancelamento e Isolação de Processos**: Envio de sinal `SIGTERM` ao grupo de processos com espera graciosa de 300ms antes de `SIGKILL`, evitando processos órfãos.
- **Descoberta Dinâmica de Rede**: Cálculo bitwise exato de CIDR para qualquer prefixo IPv4 (`/0` a `/32`) via comandos `ip` e `os.networkInterfaces()`.
- **Probe Web Integrado**: Varre servidores HTTP/HTTPS descobertos para extrair títulos de páginas, cabeçalhos, status TLS e detecção de truncamento.
- **Persistência Concorrente**: Banco de dados JSON transacional com mutex para evitar corrupção de dados sob alta concorrência.
- **Segurança Robusta**: Bind seguro em `127.0.0.1` por padrão, prevenção de Path Traversal com verificação de caminho real (`realpath`), sanitização estrita de alvos/portas por Regex e autenticação opcional via token com comparação em tempo constante (`timingSafeEqual`).

## 3. Arquitetura
O sistema adota uma arquitetura monolítica full-stack com separação clara de responsabilidades:
- **Frontend**: SPA construída com React 19, Vite, Tailwind CSS e ícones Lucide, comunicando-se com a API REST do backend.
- **Backend**: Servidor Express em Node.js (com suporte a `tsx` para TypeScript sem compilação prévia em desenvolvimento), integrando o Vite como middleware no modo dev ou servindo arquivos estáticos em produção.
- **Motor de Varredura**: Módulo dedicado (`src/scanner/`) que invoca o binário Nmap via `child_process.spawn()`, captura XML em tempo real, parseia o resultado com `xml2js` e executa probes web.

## 4. Estrutura de Diretórios Atualizada
```text
/
├── server.ts               # Servidor Express, rotas da API e integração com Vite
├── package.json            # Configuração do projeto e dependências
├── tsconfig.json           # Configuração do compilador TypeScript
├── vite.config.ts          # Configuração do bundler Vite
├── index.html              # Ponto de entrada HTML com metadados e SEO
├── src/
│   ├── App.tsx             # Componente raiz da aplicação
│   ├── index.css           # Estilos globais Tailwind CSS
│   ├── main.tsx            # Ponto de montagem React
│   ├── components/         # Componentes de interface (Dashboard, Scanner, etc.)
│   ├── db/                 # Camada de persistência JSON transacional
│   └── scanner/            # Motor de execução Nmap, parser XML e probe web
├── tests/                  # Testes automatizados e fixtures de binários
└── test_parser.ts          # Suíte de testes unitários do parser XML
```

## 5. Requisitos Reais
- **Node.js**: Versão `20.19.0` ou superior (recomendado Node.js LTS).
- **Nmap**: Binário Nmap instalado e acessível no `PATH` do sistema operacional.
- **Sistema Operacional**: Linux (Ubuntu, Debian, Arch), macOS, ou Android (via aplicativo Termux).

## 6. Versões Mínimas Corretas
- **Node.js**: `>=20.19.0`
- **TypeScript**: `^5.7.3`
- **Vite**: `^6.0.0`
- **esbuild**: `^0.28.0`
- **Express**: `^4.21.2`
- **React**: `^19.0.0`

## 7. Instalação no Android / Termux
Para executar o Ultra Nmap Pro diretamente no seu celular Android utilizando o Termux:

1. Instale o aplicativo **Termux** (recomendado via F-Droid).
2. Atualize os pacotes e instale o Node.js LTS, Git e Nmap:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs-lts nmap git -y
   ```
3. Clone o repositório do projeto:
   ```bash
   git clone https://github.com/snaidermadilus-debug/UltraNmap-_Pro.git
   cd UltraNmap-_Pro
   ```
4. Instale as dependências:
   ```bash
   npm install
   ```
5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
6. Abra o navegador do seu celular e acesse `http://127.0.0.1:3000`.

*Nota para usuários do Termux:* Algumas opções avançadas do Nmap (como SYN Scan `-sS` ou varreduras de SO `-O`) exigem privilégios root. No Termux sem root, o sistema automaticamente adapta para Connect Scan (`-sT`) e usa a flag `--unprivileged` quando necessário.

## 8. Instalação no Linux
1. Instale o Node.js (via NodeSource ou gerenciador da distro) e o Nmap:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm nmap git
   ```
2. Clone e acesse o diretório do projeto:
   ```bash
   git clone https://github.com/snaidermadilus-debug/UltraNmap-_Pro.git
   cd UltraNmap-_Pro
   ```
3. Instale as dependências e inicie:
   ```bash
   npm install
   npm run dev
   ```

## 9. Instalação no Windows
1. Instale o [Node.js LTS](https://nodejs.org/) e o [Nmap](https://nmap.org/) (garantindo que o diretório do Nmap seja adicionado às Variáveis de Ambiente PATH do Windows).
2. Abra o Prompt de Comando ou PowerShell no diretório do projeto:
   ```bash
   npm install
   npm run dev
   ```

## 10. Instalação das Dependências
Para instalar todas as dependências de produção e desenvolvimento de forma limpa:
```bash
npm install
```
O projeto já está configurado com versões compatíveis de `esbuild` (`^0.28.0`) e `vite` (`^6.0.0`), evitando conflitos de peer dependencies.

## 11. Instalação do Nmap
Certifique-se de que o comando `nmap --version` retorna a versão instalada no terminal:
- **Ubuntu/Debian/Termux**: `pkg install nmap` ou `sudo apt install nmap`
- **Arch Linux**: `sudo pacman -S nmap`
- **macOS**: `brew install nmap`

## 12. Inicialização em Desenvolvimento
```bash
npm run dev
```
Inicia o servidor backend com hot reload e o middleware Vite na porta `3000`.

## 13. Compilação para Produção
Gera os arquivos otimizados do frontend em `dist/`:
```bash
npm run build
```

## 14. Inicialização em Produção
Após compilar o frontend, execute o servidor em modo produção:
```bash
npm start
```

## 15. Endereço de Acesso
Por padrão, o servidor escuta em:
`http://127.0.0.1:3000`

## 16. Configuração de HOST e PORT
Você pode customizar o endereço de escuta e a porta através de variáveis de ambiente:
```bash
HOST=0.0.0.0 PORT=8080 npm run dev
```
*Atenção:* Expor o servidor para redes externas (`0.0.0.0`) sem configurar autenticação exigirá `ALLOW_INSECURE_BIND=1` ou um `ULTRA_API_TOKEN`.

## 17. Configuração de Autenticação
Para proteger os endpoints da API (`/api/*`), defina um token de acesso:
```bash
export ULTRA_API_TOKEN="seu_token_secreto_aqui"
npm start
```
As requisições para a API deverão incluir o header:
`Authorization: Bearer seu_token_secreto_aqui` ou `x-api-token: seu_token_secreto_aqui`.

## 18. Solução de Erros Comuns
- **Erro `nmap not found`**: O executável do Nmap não está no `PATH`. Instale o Nmap e reinicie o terminal.
- **Conflito de esbuild / Vite**: O projeto já resolve isso utilizando `esbuild: ^0.28.0` e `vite: ^6.0.0`. Caso ocorram resíduos, execute `rm -rf node_modules package-lock.json && npm install`.
- **Erro de Permissão no Android**: Scans como `-O` (OS Detection) requerem root. Utilize perfis como *Fast*, *Web*, *Serviços* ou *Top 1000* no Termux sem root.

## 19. Execução dos Testes
Para executar a suíte completa de testes unitários e de integração (validação de alvos, portas, parser XML, concorrência e timeout):
```bash
npm test
```
Para verificação estática de tipos TypeScript:
```bash
npm run typecheck
```

## 20. Limitações Conhecidas
- Em sistemas operacionais móveis (Android/Termux), recursos de raw sockets exigem privilégios root. Sem root, o Nmap recorre automaticamente a conexões TCP Connect (`-sT`), que podem ser um pouco mais lentas que SYN Scans puros.
- O banco de dados em arquivo JSON é ideal para instâncias locais e de uso individual/médio; ambientes corporativos de alta escala devem considerar migração para bancos relacionais caso necessário.