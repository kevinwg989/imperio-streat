# 🔥 IMPÉRIO STREETWEAR — Loja Virtual & Plataforma E-commerce

Plataforma de e-commerce completa, moderna e pronta para evolução desenvolvida para a marca de moda urbana **IMPÉRIO STREETWEAR**. 

O projeto conta com arquitetura modular full-stack (HTML5, CSS3, JavaScript Vanilla de alta performance, Node.js, Express e SQLite), identidade visual streetwear premium monocromática com detalhes em prata, carrinho reativo, cálculo de frete com busca automática de CEP, checkout transparente com suporte a Pix e Cartão de Crédito via Mercado Pago (com simulador sandbox local incluído) e painel administrativo protegido para gestão de produtos, estoque e pedidos.

---

## ⚡ Sumário Rápido de Execução

| Parâmetro | Detalhe |
| :--- | :--- |
| **Endereço da Loja (Frontend):** | [http://localhost:3000](http://localhost:3000) |
| **Painel Administrativo:** | [http://localhost:3000/admin](http://localhost:3000/admin) |
| **E-mail do Administrador:** | Configurado por `ADMIN_EMAIL` no `.env` |
| **Senha Inicial:** | Definida por `ADMIN_INITIAL_PASSWORD` no `.env` |
| **Comando para Iniciar:** | `npm start` ou `npm run dev` |
| **Comando de Testes:** | `npm test` |

---

## 💎 Identidade Visual Streetwear

- **Paleta de Cores:** Fundo preto profundo (`#080808`), superfícies elevadas (`#111111` / `#151515`), tipografia em branco puro e cinza chumbo, com detalhes de contraste em prata metálico (`#E2E8F0` / `#C0C0C0`).
- **Tipografia:** Montserrat e Inter, com títulos marcantes em caixa alta, espaçamento entre letras premium e atmosfera underground contemporânea.
- **Logotipo Tipográfico:** `IMPÉRIO` (letras imponentes com acabamento em gradiente prateado) + `STREETWEAR` (subtítulo com espaçamento refinado).

---

## 📂 Estrutura de Pastas

```text
imperio.streat/
├── .env.example              # Modelo de variáveis de ambiente
├── .env                      # Variáveis de ambiente locais (não versionado)
├── .gitignore                # Regras de exclusão do Git
├── package.json              # Configurações do npm e dependências
├── server.js                 # Servidor Express principal
├── data/
│   └── imperio.db            # Banco de dados SQLite persistente
├── src/
│   ├── config/
│   │   └── db.js             # Camada de dados: SQLite local e PostgreSQL no Vercel
│   ├── database/
│   │   ├── schema.sql        # Modelagem de tabelas e índices
│   │   ├── seeds.js          # Sementes com categorias e produtos demonstrativos
│   │   └── setup.js          # Script de criação inicial do banco de dados
│   ├── middleware/
│   │   ├── auth.js           # Validação de sessão e token JWT do administrador
│   │   ├── errorHandler.js   # Tratamento centralizado de erros e 404
│   │   └── rateLimiter.js    # Proteção anti-fraude no checkout e tentativas de login
│   ├── controllers/
│   │   ├── adminController.js    # Dashboard, CRUD de produtos e gestão de pedidos
│   │   ├── orderController.js    # Criação de pedidos com validação rígida no backend
│   │   ├── paymentController.js  # Webhook e status de pagamento
│   │   └── productController.js  # Catálogo, filtros, busca e detalhe do produto
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── productRoutes.js
│   │   └── settingsRoutes.js
│   └── services/
│       └── mercadoPagoService.js # Integração Mercado Pago SDK + Simulador Sandbox
├── public/
│   ├── assets/
│   │   └── images/           # Imagens e placeholders de produtos
│   ├── css/
│   │   ├── variables.css     # Tokens de cores, sombras e tipografia
│   │   ├── base.css          # Reset e utilitários
│   │   ├── components.css    # Botões, cards de produto, badges, gaveta da sacola
│   │   ├── layout.css        # Cabeçalho fixo, navegação, rodapé profissional
│   │   ├── pages.css         # Vitrine, catálogo, detalhe do produto e checkout
│   │   └── admin.css         # Interface do painel de administração
│   ├── js/
│   │   ├── api.js            # Cliente HTTP e formatação BRL
│   │   ├── cart.js           # Gerenciador da sacola (localStorage + validação)
│   │   ├── ui.js             # Notificações Toast, menu mobile, WhatsApp dinâmico
│   │   ├── main.js           # Lógica da vitrine inicial
│   │   ├── catalog.js        # Filtros por categoria, preço, busca e ordenação
│   │   ├── product.js        # Galeria, seletor de tamanhos/cores e cálculo de CEP
│   │   ├── checkout.js       # Checkout seguro em etapas com busca ViaCEP
│   │   └── admin.js          # Métricas, alternador 1-click de demonstração e pedidos
│   ├── index.html            # Página Inicial
│   ├── catalogo.html         # Catálogo Completo
│   ├── produto.html          # Detalhe do Produto
│   ├── carrinho.html         # Visão completa da sacola
│   ├── checkout.html         # Checkout Seguro
│   ├── pedido-confirmado.html# Acompanhamento do Pedido e Pagamento Pix
│   ├── sobre.html            # Manifesto e História da Marca
│   ├── contato.html          # Fale Conosco e Suporte
│   ├── politicas.html        # Termos, Privacidade (LGPD) e Trocas (CDC)
│   ├── 404.html              # Página de Erro 404
│   └── admin/
│       ├── index.html        # Dashboard com métricas e estoque crítico
│       ├── login.html        # Tela de Login do Administrador
│       ├── produtos.html     # Gestão de produtos, custos e botão de liberação
│       └── pedidos.html      # Gestão de status de pedidos
└── tests/
    └── test-runner.js        # Suite de testes automatizados integrada
```

---

## 🛠️ Instalação Passo a Passo

### 1. Pré-requisitos
- **Node.js**: Versão 18 ou superior instalada (testado e homologado no Node 20 LTS).
- **NPM**: Versão 9 ou superior.

### 2. Instalar as Dependências
Abra o terminal na pasta raiz do projeto e execute:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` (caso ainda não o tenha feito):
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# Ou no Linux/macOS:
cp .env.example .env
```
Abra o arquivo `.env` e personalize as variáveis conforme necessário:
- `PORT`: Porta do servidor (padrão `3000`).
- `JWT_SECRET`: Chave privada forte para assinatura de tokens administrativos.
- `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD`: Credenciais do administrador inicial.
- `WHATSAPP_NUMBER`: Número do WhatsApp comercial com DDI e DDD (ex: `5511999999999`).
- `MERCADO_PAGO_ACCESS_TOKEN`: Credencial da sua conta Mercado Pago (deixe vazio para usar o simulador sandbox local).

### 4. Inicializar o Banco de Dados
Gera as tabelas, índices, administrador inicial e catálogo demonstrativo:
```bash
npm run db:setup
```

### 5. Executar os Testes Automatizados
Valida todas as rotas, regras de segurança de preços e estoque, banco de dados e autenticação:
```bash
npm test
```

### 6. Iniciar a Loja
Para modo de produção local:
```bash
npm start
```
Para modo de desenvolvimento com recarregamento automático:
```bash
npm run dev
```

Abra o seu navegador em: **`http://localhost:3000`**

---

## 🛡️ Segurança e Confiabilidade

1. **Preços e Estoque Blindados no Backend:**
   - O navegador nunca decide o preço de um item nem o total do pedido.
   - O servidor consulta o banco de dados diretamente, recalcula subtotal, frete e regras de desconto, e abate o estoque com garantia transacional.
2. **Proteção Anti-Fraude e Brute-Force:**
   - Limitador de requisições (`express-rate-limit`) específico para checkout e tentativas de login.
   - Senhas de administrador criptografadas com `bcrypt` (10 rounds de salt).
   - Sessões autenticadas via `jsonwebtoken` (JWT) com suporte a header `Authorization: Bearer` e cookies `httpOnly`.
3. **Dados de Cartão Nunca Armazenados:**
   - Cumprimento rigoroso do padrão PCI-DSS: dados de cartão nunca passam em texto claro nem são salvos no banco de dados da loja.
4. **Validação de Pagamentos por Webhook:**
   - O servidor nunca confia na confirmação de pagamento vinda do navegador. O status "pago" só é concedido após verificação na API da adquirente ou validação do webhook oficial.

---

## 🏷️ O que Funciona, O que é Demonstração e O que Depende de Credenciais Externas

### ✅ Totalmente Funcional (Sem necessidade de credenciais externas)
- Navegação completa, vitrine dinâmica, catálogo com filtros por categoria, ordenação e busca em tempo real.
- Página individual de produtos com galeria de fotos, seletores de tamanhos e cores com validação de estoque disponível.
- Sacola de compras persistente (localStorage) com gaveta lateral reativa.
- Simulação de frete com preenchimento automático de endereço via **API dos Correios / ViaCEP**.
- Checkout completo em etapas com validação de CPF e dados de entrega.
- **Painel Administrativo Completo:** Dashboard de métricas, faturamento, alertas de estoque baixo, edição/criação de peças e atualização de status de pedidos (`Pendente`, `Pago`, `Em Separação`, `Enviado`, `Entregue`, `Cancelado`).
- **Botão Flutuante do WhatsApp:** Vinculado dinamicamente à variável `WHATSAPP_NUMBER` do `.env`.
- **Suite de testes automatizados (`npm test`)** cobrindo 12 casos de teste de segurança e funcionalidade.

### ⚠️ Peças Demonstrativas de Catálogo (`is_demo = 1`)
- Em cumprimento às diretrizes do projeto, as peças do catálogo inicial foram cadastradas com a marcação **"Amostra Demonstrativa de Catálogo / Pré-Lançamento"**.
- O sistema exibe um aviso claro para o cliente e **impede a finalização de compras dessas peças no checkout**, evitando vender produtos sem fornecedor e custo final homologados.
- **Como liberar um produto para venda:** Acesse o painel em `http://localhost:3000/admin/produtos` e clique no botão da coluna **"Status Demonstração"** para alternar para *"Liberado para Venda"* com apenas **1 clique**!
- Uma peça de teste (*Camiseta Oversized Heavy Black*) foi deixada pré-liberada para que você possa testar o checkout de ponta a ponta sem restrições.

### 💳 Modo Sandbox vs. Credenciais Reais do Mercado Pago
- **Sem chaves configuradas (Padrão inicial):** O sistema opera automaticamente no **Modo Sandbox / Simulador Local Seguro**. Ao selecionar Pix no checkout, um código Pix e QR Code são gerados, e a página de pedido oferece um botão *"Simular Aprovação de Pagamento Pix (Sandbox)"*, permitindo testar toda a transição de status e abatimento de estoque sem precisar de dinheiro real.
- **Com credenciais reais:** Assim que você possuir suas credenciais no [Portal de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app), basta preencher `MERCADO_PAGO_PUBLIC_KEY` e `MERCADO_PAGO_ACCESS_TOKEN` no arquivo `.env`. O sistema passará a se comunicar diretamente com a API do Mercado Pago para gerar cobranças bancárias reais.

---

## 🚀 Orientações para Produção e Banco de Dados

- **Persistência do SQLite:** O SQLite armazena todos os dados no arquivo local `./data/imperio.db`. Em servidores virtuais dedicados (VPS, DigitalOcean, Linode, AWS EC2) ou serviços com volumes persistentes (Fly.io, Railway com volume), o SQLite é extremamente veloz, confiável e tem custo zero.
- **Atenção para Hospedagens Efêmeras (ex: Render, Heroku básico):** Em hospedagens sem disco persistente, o sistema de arquivos é reiniciado periodicamente, o que apagaria o arquivo `.db`. Para publicar em tais ambientes, utilize um disco persistente montado na pasta `./data` ou migre a camada de dados em `src/config/db.js` para PostgreSQL (ex: Supabase, Neon ou AWS RDS).

### Publicação no Vercel com Neon

O arquivo `vercel.json` na raiz configura o `server.js` como uma função Node.js; o Express é exportado sem iniciar um servidor HTTP próprio. A publicação pode ser feita importando o repositório no Vercel e mantendo a raiz do projeto como diretório de trabalho.

1. Crie um banco PostgreSQL no Neon e copie a **pooled connection string**.
2. Inicialize o schema e os dados de catálogo/admin pela raiz do projeto. No PowerShell, configure a URL e as credenciais seguras do administrador e execute:

   ```powershell
   $env:DATABASE_URL = "postgresql://..."
   $env:ADMIN_EMAIL = "seu-email"
   $env:ADMIN_INITIAL_PASSWORD = "uma-senha-forte-e-unica"
   npm run db:setup
   ```

   Esse comando é executado uma vez por banco. Ele cria as tabelas e os dados iniciais, inclusive o administrador. Não copia registros existentes do arquivo SQLite local.
3. Configure no Vercel as variáveis de ambiente abaixo e faça o deploy:

Configure em **Project Settings → Environment Variables**:

- `NODE_ENV=production`
- `DATABASE_URL`: pooled connection string do Neon.
- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres; obrigatório em produção.
- `STORE_URL`: URL pública HTTPS do projeto, usada em notificações do Mercado Pago.
- `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` e, se aplicável, `MERCADO_PAGO_WEBHOOK_SECRET`.
- `WHATSAPP_NUMBER` e outras configurações comerciais usadas pela loja.

`ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` são usados apenas durante a inicialização do Neon; mantenha-os fora do repositório e não os adicione ao Vercel se não precisar executar o setup novamente. O SQLite continua sendo usado localmente quando `DATABASE_URL` não está definido. O arquivo SQLite existente não é migrado automaticamente para o Neon; importe dados necessários antes de direcionar tráfego de produção. Nunca publique `.env` nem credenciais em repositórios.

---

## 📄 Licença e Propriedade

Desenvolvido para **IMPÉRIO STREETWEAR**. Todos os direitos reservados.
Este software é fornecido pronto para evolução comercial sob licença proprietária da marca.
# IMP-RIO-STREETWEAR
#   I M P - R I O - S T R E E T W E A R  
 # IMP-RIO-STREETWEAR
