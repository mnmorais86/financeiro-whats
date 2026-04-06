# Sistema simples de dívidas por mês no WhatsApp

Esse projeto foi feito para você e sua esposa controlarem dívidas mensais pelo **WhatsApp**, com um **painel web simples** para visualizar e alterar tudo.

## O que esse sistema faz

- Recebe comandos pelo WhatsApp
- Cadastra dívidas por mês
- Lista dívidas do mês
- Mostra resumo do mês
- Marca conta como paga
- Desfaz pagamento
- Edita valor, descrição e vencimento
- Apaga dívida
- Permite acesso web com login e senha
- Aceita somente os números autorizados

---

## Como usar no WhatsApp

Envie mensagens para o número conectado na API do WhatsApp.

### Comandos

```txt
ajuda

add 350 internet 10/04/2026
add 500 aluguel

listar
listar 04/2026

resumo
resumo 04/2026

pagar 3
pagar 3 150

desfazer 3

editar 3 valor 650
editar 3 descricao cartao nubank
editar 3 vencimento 15/04/2026

apagar 3
```

---

## Estrutura do sistema

- `server.js` -> servidor principal, webhook e painel
- `db.js` -> banco SQLite
- `debtService.js` -> regras das dívidas
- `commandHandler.js` -> interpreta os comandos do WhatsApp
- `whatsapp.js` -> envia mensagens pela API oficial
- `views/` -> painel web
- `database.sqlite` -> banco criado automaticamente

---

## Requisitos

- Node.js 20 ou superior
- Conta Meta Developer
- WhatsApp Cloud API configurada
- URL pública com HTTPS para receber webhook

Você vai precisar:
- `META_ACCESS_TOKEN`
- `PHONE_NUMBER_ID`
- `VERIFY_TOKEN`

A plataforma oficial da Meta informa que a WhatsApp Business Platform permite enviar e receber mensagens via Cloud API e usar webhooks para receber eventos. A documentação oficial também orienta a configurar um endpoint público de webhook e validar a assinatura durante a configuração. citeturn929576search0turn929576search2turn929576search8

---

## Passo a passo de instalação

### 1) Baixe os arquivos
Extraia a pasta do projeto.

### 2) Instale as dependências
No terminal, dentro da pasta do projeto:

```bash
npm install
```

### 3) Configure o arquivo `.env`
Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Depois edite e preencha:

```env
PORT=3000
BASE_URL=https://SEU-ENDERECO-PUBLICO
VERIFY_TOKEN=troque_esse_token
META_ACCESS_TOKEN=cole_seu_token_meta
PHONE_NUMBER_ID=cole_o_phone_number_id
GRAPH_API_VERSION=v23.0
ALLOWED_NUMBERS=5599999999999,5588888888888
SESSION_SECRET=troque_essa_senha_bem_forte
WEB_USER=admin
WEB_PASSWORD=123456
TIMEZONE=America/Sao_Paulo
```

### 4) Inicie o sistema

```bash
npm start
```

Vai abrir em:

```txt
http://localhost:3000
```

---

## Configuração da Meta / WhatsApp Cloud API

### 1) Criar app na Meta
Crie um app no painel de desenvolvedor da Meta e adicione o produto WhatsApp.

### 2) Obter dados principais
Pegue:
- Access Token
- Phone Number ID
- WhatsApp Business Account

### 3) Configurar webhook
Na configuração do WhatsApp na Meta:
- Callback URL: `https://SEU-DOMINIO/webhook`
- Verify Token: o mesmo do `.env`

Quando a Meta chamar o endpoint GET `/webhook`, esse projeto responde com o `hub.challenge` se o token bater.

### 4) Assinar o campo de mensagens
Assine o campo **messages** no webhook da aplicação.

A documentação oficial da Meta descreve o webhook de mensagens como o recurso que entrega as mensagens enviadas pelo usuário e os status das mensagens da empresa. citeturn929576search4

---

## Liberar acesso para você e sua esposa

No `.env`, coloque os dois números com DDI e DDD, sem espaços:

```env
ALLOWED_NUMBERS=5511999999999,5511888888888
```

Exemplo do Brasil:
- `55` = país
- `11` = DDD
- resto = número

---

## Painel web

Acesse:

```txt
http://localhost:3000/login
```

Login padrão do `.env`:
- usuário: `admin`
- senha: `123456`

Troque isso antes de usar em produção.

No painel vocês podem:
- ver o mês
- adicionar conta
- marcar como paga
- desfazer pagamento
- apagar

---

## Como publicar grátis ou barato

Você pode rodar esse sistema em:
- VPS
- Railway
- Render
- Easypanel
- servidor local com túnel HTTPS

Para teste local, você pode usar túnel HTTPS como:
- ngrok
- Cloudflare Tunnel

O ponto importante é que a Meta precisa alcançar um endpoint público HTTPS para enviar os webhooks. Isso é parte do fluxo oficial de configuração do webhook. citeturn929576search0turn929576search2turn929576search6

---

## Melhorias futuras que dá para adicionar

- lembrete automático de vencimento
- categorias de contas
- relatório por PDF
- exportação para Excel
- login individual para cada pessoa
- parcelas recorrentes
- gráfico mensal
- backup em nuvem

---

## Observação importante

Esse projeto usa a **API oficial da Meta**. Para funcionar de verdade no WhatsApp, você precisa concluir a configuração do app, do número e do webhook no painel da Meta. A API oficial possui regras próprias de conta, templates e cobrança, que podem variar conforme o tipo de conversa e a configuração da conta. citeturn929576search2turn929576search14
