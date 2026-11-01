# Ultra Nmap Pro

Painel web mobile-first para execução, acompanhamento e análise de
auditorias Nmap em ambiente local, com foco em Termux/Android.

O projeto fornece uma interface gráfica para iniciar auditorias reais,
acompanhar jobs, visualizar resultados estruturados, consultar histórico
e analisar a saída técnica do Nmap.

> **Uso responsável:** utilize o Ultra Nmap Pro somente em dispositivos,
> redes e sistemas para os quais você tenha autorização para realizar
> testes.

------------------------------------------------------------------------

## ✨ Principais recursos

-   Interface web responsiva e mobile-first.
-   Execução real do Nmap pelo backend.
-   Gerenciamento de jobs de auditoria.
-   Estados de execução:
    -   `queued`
    -   `running`
    -   `completed`
    -   `failed`
    -   `cancelled`
-   Cancelamento real de processos em execução.
-   Parser de XML do Nmap para dados estruturados.
-   Resumo dos resultados em linguagem mais simples.
-   Visualização de portas e serviços encontrados.
-   Saída técnica do Nmap em seção recolhível.
-   Histórico persistente das auditorias.
-   Busca e filtragem do histórico.
-   Logs do sistema.
-   Dashboard com dados reais.
-   Persistência local usando LowDB/JSON.
-   Fila de escrita para reduzir riscos de corrupção do arquivo de dados
    em gravações concorrentes.
-   Limite de histórico para evitar crescimento indefinido do banco
    JSON.
-   Execução local por padrão em `127.0.0.1:8080`.

------------------------------------------------------------------------

## 🧱 Arquitetura

O fluxo principal da aplicação é:

``` text
Navegador
   │
   ▼
Frontend React
   │
   ▼
API Express
   │
   ▼
Gerenciador de Jobs
   │
   ▼
Nmap
   │
   ├── stdout
   ├── stderr
   └── XML
        │
        ▼
     Parser
        │
        ▼
Dados estruturados
        │
        ▼
LowDB / data/db.json
        │
        ▼
Histórico / Resultados / Dashboard
```

### Tecnologias

-   Node.js
-   TypeScript
-   Express
-   React
-   Vite
-   Tailwind CSS
-   LowDB
-   Nmap

------------------------------------------------------------------------

## 📁 Estrutura do projeto

``` text
ultra-nmap-pro/
├── ultra.sh
├── package.json
├── server.ts
├── data/
│   └── db.json
├── src/
│   ├── App.tsx
│   ├── db/
│   │   └── db.ts
│   ├── scanner/
│   │   ├── scanner.ts
│   │   └── parser.ts
│   └── components/
│       ├── Dashboard.tsx
│       ├── Scanner.tsx
│       ├── Executions.tsx
│       ├── History.tsx
│       ├── ScanDetails.tsx
│       ├── Logs.tsx
│       └── Navigation.tsx
└── ...
```

------------------------------------------------------------------------

## ⚙️ Requisitos

Antes de executar, o ambiente precisa possuir:

-   Node.js
-   npm
-   Nmap
-   Termux, caso esteja executando no Android

Verifique:

``` bash
node --version
npm --version
nmap --version
```

O script `ultra.sh` também realiza a verificação das dependências
necessárias.

------------------------------------------------------------------------

## 🚀 Instalação

Entre na pasta do projeto:

``` bash
cd ~/ultra-nmap-pro
```

Instale as dependências:

``` bash
npm install
```

Gere o build de produção:

``` bash
npm run build
```

------------------------------------------------------------------------

## ▶️ Executando

A forma recomendada é utilizar:

npx tsx server.ts

rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

------------------------------------------------------------------------

## 🔎 Primeiro scan

1.  Abra o painel no navegador.
2.  Entre em **Scanner**.
3.  Escolha o tipo de auditoria.
4.  Informe o alvo autorizado.
5.  Inicie a auditoria.
6.  Acompanhe o job em **Execuções**.
7.  Aguarde a conclusão.
8.  Abra o resultado.
9.  Consulte as portas e serviços encontrados.
10. Se necessário, expanda a saída técnica do Nmap.

Exemplo para ambiente local:

``` text
127.0.0.1
```

------------------------------------------------------------------------

## 🔍 Tipos de auditoria

A interface disponibiliza os perfis de scan implementados pelo backend.

### Scan Rápido

Voltado para uma descoberta rápida de portas e serviços.

### Portas Comuns

Analisa as portas mais utilizadas.

### Todas as Portas

Executa uma análise TCP mais abrangente e pode levar mais tempo.

Os argumentos efetivamente utilizados são definidos pelo backend e
enviados ao Nmap como argumentos estruturados.

------------------------------------------------------------------------

## 🧠 Resultados

Após uma auditoria concluída, o Ultra Nmap Pro apresenta:

-   alvo;
-   estado da auditoria;
-   informações de execução;
-   portas encontradas;
-   protocolo;
-   estado da porta;
-   serviço identificado;
-   versão quando disponível;
-   interpretação simplificada;
-   saída técnica original.

A interpretação humana é baseada nos dados retornados pelo Nmap.

Uma porta aberta, por si só, não é tratada automaticamente como uma
vulnerabilidade.

------------------------------------------------------------------------

## 🛑 Cancelamento

Auditorias em execução podem ser canceladas pela interface.

O backend mantém o controle do processo e envia um sinal de término ao
processo Nmap associado ao job.

O estado da auditoria é atualizado para:

``` text
cancelled
```

quando o cancelamento é processado.

------------------------------------------------------------------------

## 📊 Histórico

O histórico armazena as auditorias realizadas e permite consultar
resultados anteriores.

A interface permite:

-   visualizar auditorias;
-   pesquisar;
-   filtrar;
-   abrir detalhes;
-   consultar resultados persistidos.

O projeto utiliza um limite de histórico para evitar crescimento
indefinido do arquivo JSON.

------------------------------------------------------------------------

## 📝 Logs

A seção de Logs apresenta eventos registrados pelo sistema.

Ela é separada da saída técnica do Nmap.

Isso permite diferenciar:

``` text
Logs do sistema
```

de:

``` text
Saída técnica do Nmap
```

------------------------------------------------------------------------

## 💾 Persistência

Os dados são armazenados localmente em:

``` text
data/db.json
```

O projeto utiliza LowDB/JSON para evitar dependências nativas adicionais
e manter uma instalação simples em ambientes como Termux.

A camada de persistência possui uma fila de escrita para organizar
gravações e reduzir riscos de corrupção quando múltiplas operações
tentam atualizar os dados.

------------------------------------------------------------------------

## 🔐 Segurança

O Ultra Nmap Pro foi projetado para execução local.

Por padrão, o servidor utiliza:

``` text
127.0.0.1
```

A execução do Nmap utiliza argumentos estruturados em vez de montar
comandos shell diretamente com a entrada do usuário.

Isso reduz o risco de command injection.

### Boas práticas

-   Não execute scans contra sistemas sem autorização.
-   Não coloque comandos shell no campo de alvo.
-   Não exponha o servidor para a rede sem entender as implicações de
    segurança.
-   Use apenas alvos que você controla ou para os quais possui
    autorização explícita.

------------------------------------------------------------------------

## 🧪 Testes

O projeto foi validado em relação aos principais fluxos:

-   inicialização;
-   detecção de Node.js;
-   detecção de npm;
-   detecção do Nmap;
-   execução de auditoria;
-   criação de jobs;
-   acompanhamento de estados;
-   cancelamento;
-   parser XML;
-   persistência;
-   histórico;
-   logs;
-   interface responsiva;
-   build de produção.

Para gerar o build:

``` bash
npm run build
```

------------------------------------------------------------------------

## 📱 Uso no Termux

Exemplo de fluxo:

``` bash
cd ~/ultra-nmap-pro
chmod +x ultra.sh
./ultra.sh
```

Depois:

``` text
http://127.0.0.1:8080
```

O painel pode ser acessado pelo navegador do próprio dispositivo.

------------------------------------------------------------------------

## 🛠️ Solução de problemas

### Nmap não encontrado

Verifique:

``` bash
nmap --version
```

Se o comando não existir, instale o Nmap no ambiente Termux antes de
iniciar o projeto.

### Node.js não encontrado

Verifique:

``` bash
node --version
```

### npm não encontrado

Verifique:

``` bash
npm --version
```

### Porta 8080 ocupada

Verifique qual processo está utilizando a porta antes de iniciar outra
instância do servidor.

### Interface não abre

Confirme se o servidor está em execução e tente:

``` text
http://127.0.0.1:8080
```

Também verifique os logs exibidos no terminal.

------------------------------------------------------------------------

## ⚠️ Limitações conhecidas

O banco é baseado em JSON/LowDB. A solução é adequada para uso local e
individual, mas não foi projetada para alta concorrência com muitos
usuários ou vários processos independentes escrevendo simultaneamente no
mesmo arquivo.

O histórico possui limite para evitar crescimento indefinido do arquivo.

O tempo de determinados scans pode variar conforme o alvo, rede e opções
utilizadas.

------------------------------------------------------------------------

## 📌 Status

**Status atual: pronto para teste/uso local no Termux.**

O projeto possui:

-   backend funcional;
-   scanner Nmap real;
-   parser estruturado;
-   persistência;
-   histórico;
-   logs;
-   gerenciamento de jobs;
-   cancelamento;
-   interface mobile-first.

------------------------------------------------------------------------

## ⚖️ Uso responsável

Este projeto é uma interface para ferramentas de análise de rede.

Use-o somente para:

-   seus próprios dispositivos;
-   ambientes de laboratório;
-   redes sob sua administração;
-   sistemas em que você tenha autorização para realizar auditorias.

O fato de uma ferramenta conseguir analisar um alvo não significa que
você tenha autorização para fazê-lo.

------------------------------------------------------------------------

## 📄 Licença

Defina aqui a licença do projeto caso ele seja publicado no GitHub.

Exemplos:

``` text
MIT
```

ou outra licença compatível com os componentes e dependências
utilizadas.
