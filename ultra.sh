#!/bin/bash

# Ultra Nmap Pro - Inicialização no Termux

echo "╔══════════════════════════════════════╗"
echo "║        ULTRA NMAP PRO                ║"
echo "╚══════════════════════════════════════╝"

# Verifica dependências
if ! command -v nmap &> /dev/null; then
    echo "✗ Nmap não encontrado. Instale-o com: pkg install nmap"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "✗ Node.js não encontrado. Instale-o com: pkg install nodejs"
    exit 1
fi

echo "Nmap: ✓ Instalado"

# Iniciar servidor
echo "Servidor iniciado."
echo "Painel: http://127.0.0.1:8080"
echo "Pressione Ctrl+C para encerrar."

npm run start
