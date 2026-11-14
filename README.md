# Digital Store API

API REST do projeto final de Back-end (Digital College) para uma loja virtual. Permite cadastrar usuários, categorias e produtos (com imagens, opções e categorias), com autenticação por token e busca com filtros.

## Tecnologias

- Node.js e Express 5
- MySQL com Sequelize (ORM) e Migrations
- JWT (jsonwebtoken) para autenticação
- bcrypt para criptografar senhas
- Swagger UI para a documentação da API

## Requisitos

- Node.js 18 ou superior
- MySQL 8 (ou compatível) em execução
- Git

## Como rodar o projeto

### 1. Clonar e instalar

```bash
git clone https://github.com/nnaiadyyffernandess/digital-store-api.git
cd digital-store-api
npm install
```

### 2. Criar o banco de dados

Entre no MySQL (pelo terminal ou pelo MySQL Workbench) e execute:

```sql
CREATE DATABASE digital_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'digital_user'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON digital_store.* TO 'digital_user'@'localhost';
FLUSH PRIVILEGES;
```

Se preferir, use outro nome de banco, usuário e senha, e coloque os mesmos valores no `.env`.

### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e preencha com os seus dados:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `PORT` | Porta em que a API vai rodar (padrão: `3000`) |
| `DB_HOST` | Endereço do MySQL (padrão: `localhost`) |
| `DB_PORT` | Porta do MySQL (padrão: `3306`) |
| `DB_NAME` | Nome do banco de dados |
| `DB_USER` | Usuário do banco |
| `DB_PASSWORD` | Senha do usuário do banco |
| `JWT_SECRET` | Chave secreta usada para assinar os tokens |

### 4. Criar as tabelas (migrations)

```bash
npx sequelize-cli db:migrate
```

Para desfazer a última migration: `npx sequelize-cli db:migrate:undo`.

### 5. Iniciar a API

```bash
npm run dev     # desenvolvimento, reinicia sozinho a cada alteração
npm start       # execução normal
```

A API fica disponível em **http://localhost:3000** (ou na porta definida em `PORT`). Para conferir se está no ar, acesse `/health`.

## Dados iniciais

Antes de criar as categorias, cadastre um usuário e faça login, como explicado na seção "Documentação da API (Swagger)" mais abaixo. Depois, crie as categorias pelo Swagger (`POST /v1/category`) ou pelo `curl`. Troque `<token>` pelo token do login:

```bash
curl -X POST http://localhost:3000/v1/category \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Shoes", "slug": "shoes", "use_in_menu": true}'
```

As categorias usadas no projeto são:

| Nome | Slug | `use_in_menu` |
|---|---|---|
| Shoes | `shoes` | `true` |
| Black Friday | `black-friday` | `false` |
| Offers | `offers` | `true` |

Repita o comando acima para cada uma delas, trocando os dados do `-d`. Os produtos usam os ids das categorias (`category_ids`), então elas precisam existir antes de cadastrar um produto.

## Documentação da API (Swagger)

Com a API rodando, abra **http://localhost:3000/api-docs** para ver e testar todas as rotas.

Para testar as rotas protegidas pelo Swagger:

1. Cadastre um usuário em `POST /v1/user`.
2. Faça login em `POST /v1/user/token` e copie o token da resposta.
3. Clique em **Authorize**, cole o token (sem a palavra `Bearer`) e confirme.

O token vale por 1 hora. Depois disso, faça o login de novo.

## Autenticação

As rotas marcadas como **protegidas** exigem o cabeçalho:

```
Authorization: Bearer <token>
```

Sem o token, ou com um token inválido ou expirado, a API responde `401`.

## Rotas

### Usuários

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/v1/user` | Público | Cadastra um usuário |
| POST | `/v1/user/token` | Público | Faz login e devolve o token |
| GET | `/v1/user/:id` | Público | Busca um usuário pelo id |
| PUT | `/v1/user/:id` | Protegido | Atualiza nome, sobrenome e e-mail |
| DELETE | `/v1/user/:id` | Protegido | Exclui um usuário |

### Categorias

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/v1/category/search` | Público | Lista categorias (com paginação) |
| GET | `/v1/category/:id` | Público | Busca uma categoria pelo id |
| POST | `/v1/category` | Protegido | Cadastra uma categoria |
| PUT | `/v1/category/:id` | Protegido | Atualiza uma categoria |
| DELETE | `/v1/category/:id` | Protegido | Exclui uma categoria |

### Produtos

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/v1/product/search` | Público | Busca produtos com filtros e paginação |
| GET | `/v1/product/:id` | Público | Busca um produto pelo id |
| POST | `/v1/product` | Protegido | Cadastra um produto |
| PUT | `/v1/product/:id` | Protegido | Atualiza um produto |
| DELETE | `/v1/product/:id` | Protegido | Exclui um produto |

As categorias devem existir antes de cadastrar um produto que use `category_ids`.

### Parâmetros das buscas

| Parâmetro | Vale para | Descrição |
|---|---|---|
| `limit` | categorias e produtos | Itens por página (padrão 12; `-1` traz todos) |
| `page` | categorias e produtos | Número da página (padrão 1) |
| `fields` | categorias e produtos | Campos que devem voltar, separados por vírgula |
| `use_in_menu` | categorias | `true` ou `false` |
| `match` | produtos | Texto procurado no nome ou na descrição |
| `category_ids` | produtos | Ids de categorias separados por vírgula |
| `price-range` | produtos | Faixa do preço no formato `100-200` |
| `option[ID]` | produtos | Valores da opção, por exemplo `option[5]=GG,PP` |

A busca de produtos também devolve os produtos desabilitados. Exemplo:

```
GET /v1/product/search?match=camiseta&price-range=50-100&limit=5
```

## Imagens dos produtos

As imagens são enviadas em **base64** no cadastro e na atualização do produto. Elas são salvas na pasta `public/media` e ficam disponíveis em `http://localhost:3000/media/<arquivo>`. Ao excluir um produto, os arquivos das imagens também são apagados.

## Códigos de resposta

| Código | Quando acontece |
|---|---|
| 200 | Consulta feita com sucesso |
| 201 | Registro criado |
| 204 | Atualização ou exclusão feita (resposta sem corpo) |
| 400 | Dados inválidos ou campos obrigatórios ausentes |
| 401 | Token ausente, inválido ou expirado |
| 404 | Registro ou rota não encontrada |
| 500 | Erro interno do servidor |

As mensagens de erro vêm no formato `{ "message": "..." }`.

## Estrutura do projeto

```
src/
├── config/          configuração do banco (Sequelize)
├── controllers/     regras de cada rota
├── database/
│   └── migrations/  criação das tabelas
├── docs/            documentação Swagger
├── middleware/      autenticação e tratamento de erros assíncronos
├── models/          modelos do Sequelize
├── routes/          definição das rotas
├── services/        validações e funções de apoio
├── app.js           configuração do Express
└── server.js        inicialização do servidor
public/media/        imagens dos produtos
tests/requests/      exemplos de requisições em JSON
```

## Autoria

Projeto desenvolvido por: Náiady Fernandes