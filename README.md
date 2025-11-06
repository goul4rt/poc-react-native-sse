# POC SSE - React Native

Este projeto é uma **Proof of Concept (POC)** para validação da biblioteca [react-native-sse](https://github.com/bokuweb/react-native-sse) para implementação de **Server-Sent Events (SSE)** em aplicações React Native.

## 📋 Sobre o Projeto

Este projeto foi criado para testar e validar a implementação de SSE em React Native, uma tecnologia interessante para comunicação em tempo real entre servidor e cliente. A aplicação demonstra um cenário de **distribuição de carga** onde múltiplos clientes podem se conectar e processar produtos em tempo real através de eventos SSE.

### Funcionalidades Demonstradas

- ✅ Conexão SSE com reconexão automática
- ✅ Recebimento de eventos em tempo real
- ✅ Distribuição de carga entre múltiplos clientes
- ✅ Processamento de produtos com atualização em tempo real
- ✅ Interface visual mostrando status da conexão, produtos e clientes conectados

## 🚀 Tecnologias Utilizadas

- **React Native** 0.82.1
- **React** 19.1.1
- **TypeScript**
- **react-native-sse** 1.2.0
- **Node.js** (servidor de teste)

## 📦 Estrutura do Projeto

```
pocsse/
├── features/
│   └── sse/
│       ├── components/
│       │   └── SSEExample/
│       │       ├── CargaSection.tsx      # Seção de informações da carga
│       │       ├── ClientesSection.tsx   # Lista de clientes conectados
│       │       ├── ControlsSection.tsx   # Controles de conexão
│       │       ├── ErrorSection.tsx      # Exibição de erros
│       │       ├── FinalizacaoSection.tsx # Mensagem de finalização
│       │       ├── Header.tsx             # Cabeçalho
│       │       ├── MessagesSection.tsx   # Histórico de mensagens SSE
│       │       ├── ProdutoAtualSection.tsx # Produto em processamento
│       │       ├── ProdutosSection.tsx    # Lista de produtos
│       │       ├── StatusSection.tsx      # Status da conexão
│       │       ├── types.ts              # Tipos TypeScript
│       │       └── utils.ts              # Utilitários
│       ├── hooks/
│       │   └── useSSE.ts                 # Hook customizado para SSE
│       ├── types/
│       │   └── index.ts                  # Tipos compartilhados
│       ├── SSEExample.tsx                # Componente principal
│       └── index.ts                      # Exports
├── test-sse-server.js                    # Servidor de teste Node.js
└── App.tsx                               # Componente raiz
```

## 🛠️ Como Executar

### Pré-requisitos

- Node.js >= 20
- React Native CLI instalado
- Android Studio ou Xcode (dependendo da plataforma)

### 1. Instalar Dependências

```sh
npm install
```

### 2. Iniciar o Servidor SSE de Teste

Em um terminal, execute o servidor de teste:

```sh
node test-sse-server.js
```

O servidor estará rodando em `http://localhost:3005`

### 3. Iniciar o Metro Bundler

Em outro terminal:

```sh
npm start
```

### 4. Executar a Aplicação

#### Android

```sh
npm run android
```

#### iOS

Primeiro, instale as dependências do CocoaPods:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

Depois, execute:

```sh
npm run ios
```

## 📱 Como Usar

1. **Conectar**: Toque no botão "Conectar" para estabelecer conexão SSE com o servidor
2. **Pegar Produto**: Quando conectado, você pode pegar um produto disponível para processar
3. **Processar**: O produto será processado automaticamente (simulação de 8-12 segundos)
4. **Finalizar**: Após o processamento, o produto será finalizado automaticamente
5. **Desconectar**: Use o botão "Desconectar" para fechar a conexão SSE

### Cenário de Teste

A aplicação simula um cenário onde:
- Múltiplos clientes podem se conectar simultaneamente
- Produtos são distribuídos entre os clientes conectados
- Um cliente simulado (backend) também processa produtos
- Todos os clientes recebem atualizações em tempo real sobre o estado dos produtos

## 🔧 Configuração

O servidor SSE está configurado para rodar na porta `3005` por padrão. Para alterar, edite a constante `PORT` no arquivo `test-sse-server.js`.

A URL do SSE pode ser configurada no componente `SSEExample.tsx` através da função `getDefaultSSEUrl()`.

## 🎯 Objetivo da POC

Este projeto foi criado para:
- Validar a funcionalidade da biblioteca `react-native-sse`
- Testar implementação de SSE em React Native
- Avaliar performance e comportamento em tempo real
- Criar um exemplo de uso prático de SSE

## 📝 Notas

- Este é um projeto de **validação/estudo**, não destinado para produção
- O servidor de teste (`test-sse-server.js`) é apenas para demonstração
- A aplicação foi desenvolvida para testar a viabilidade de usar SSE em projetos React Native

**Nota**: Este projeto foi criado como uma validação de biblioteca para testar Server-Sent Events em React Native.
