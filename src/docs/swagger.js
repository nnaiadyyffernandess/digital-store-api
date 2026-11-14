// Documentação da API no formato OpenAPI 3.0 (mostrada pelo Swagger UI em /api-docs)

// Resposta de erro padrão: { "message": "..." }
const errorResponse = (description) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/Error' } },
  },
})

const unauthorized = errorResponse('Token ausente, inválido ou expirado')
const secured = [{ bearerAuth: [] }]

// Parâmetro de rota :id
const idParam = (name) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `Id do(a) ${name}`,
  schema: { type: 'integer', example: 1 },
})

// Parâmetros de paginação e seleção de campos, comuns às buscas
const paginationParams = [
  {
    name: 'limit',
    in: 'query',
    description: 'Itens por página (padrão 12). Use -1 para trazer todos.',
    schema: { type: 'integer', example: 12 },
  },
  {
    name: 'page',
    in: 'query',
    description: 'Número da página (padrão 1)',
    schema: { type: 'integer', example: 1 },
  },
  {
    name: 'fields',
    in: 'query',
    description: 'Campos que devem voltar na resposta, separados por vírgula',
    schema: { type: 'string', example: 'id,name' },
  },
]

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store API',
    version: '1.0.0',
    description:
      'API do projeto final de Back-end (Digital College): usuários, categorias e produtos. ' +
      'As rotas com cadeado exigem token: faça login em POST /v1/user/token, ' +
      'clique em "Authorize" e cole o token.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Servidor local' }],
  tags: [
    { name: 'Usuários', description: 'Cadastro, consulta, atualização e exclusão de usuários' },
    { name: 'Autenticação', description: 'Geração do token de acesso' },
    { name: 'Categorias', description: 'CRUD de categorias' },
    { name: 'Produtos', description: 'CRUD e busca de produtos' },
  ],

  paths: {
    // ---------------------------------------------------------------- Autenticação
    '/v1/user/token': {
      post: {
        tags: ['Autenticação'],
        summary: 'Gera o token de acesso (login)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Login' } },
          },
        },
        responses: {
          200: {
            description: 'Token gerado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Token' } },
            },
          },
          400: errorResponse('Campos obrigatórios ausentes'),
          401: errorResponse('E-mail ou senha incorretos'),
        },
      },
    },

    // ---------------------------------------------------------------- Usuários
    '/v1/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastra um usuário',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserCreate' } },
          },
        },
        responses: {
          201: {
            description: 'Usuário criado (a senha nunca é devolvida)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          400: errorResponse(
            'Campos ausentes, e-mail inválido, senhas diferentes ou e-mail já cadastrado'
          ),
        },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Usuários'],
        summary: 'Busca um usuário pelo id',
        parameters: [idParam('usuário')],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          404: errorResponse('Usuário não encontrado'),
        },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualiza nome, sobrenome e e-mail de um usuário',
        security: secured,
        parameters: [idParam('usuário')],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserUpdate' } },
          },
        },
        responses: {
          204: { description: 'Atualizado com sucesso (sem corpo)' },
          400: errorResponse('Campos ausentes, e-mail inválido ou e-mail de outro usuário'),
          401: unauthorized,
          404: errorResponse('Usuário não encontrado'),
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Exclui um usuário',
        security: secured,
        parameters: [idParam('usuário')],
        responses: {
          204: { description: 'Excluído com sucesso (sem corpo)' },
          401: unauthorized,
          404: errorResponse('Usuário não encontrado'),
        },
      },
    },

    // ---------------------------------------------------------------- Categorias
    '/v1/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Lista categorias, com paginação e filtro',
        parameters: [
          ...paginationParams,
          {
            name: 'use_in_menu',
            in: 'query',
            description: 'Filtra as categorias que aparecem (ou não) no menu',
            schema: { type: 'boolean', example: true },
          },
        ],
        responses: {
          200: {
            description: 'Página de categorias',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' },
                    },
                    total: { type: 'integer', example: 3 },
                    limit: { type: 'integer', example: 12 },
                    page: { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          400: errorResponse('Parâmetro de busca inválido'),
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Cadastra uma categoria',
        security: secured,
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } },
          },
        },
        responses: {
          201: {
            description: 'Categoria criada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Category' } },
            },
          },
          400: errorResponse('Dados inválidos'),
          401: unauthorized,
        },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categorias'],
        summary: 'Busca uma categoria pelo id',
        parameters: [idParam('categoria')],
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Category' } },
            },
          },
          404: errorResponse('Categoria não encontrada'),
        },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualiza uma categoria',
        security: secured,
        parameters: [idParam('categoria')],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CategoryInput' } },
          },
        },
        responses: {
          204: { description: 'Atualizada com sucesso (sem corpo)' },
          400: errorResponse('Dados inválidos'),
          401: unauthorized,
          404: errorResponse('Categoria não encontrada'),
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Exclui uma categoria',
        security: secured,
        parameters: [idParam('categoria')],
        responses: {
          204: { description: 'Excluída com sucesso (sem corpo)' },
          401: unauthorized,
          404: errorResponse('Categoria não encontrada'),
        },
      },
    },

    // ---------------------------------------------------------------- Produtos
    '/v1/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Busca produtos, com filtros e paginação',
        description:
          'Devolve também os produtos desabilitados. Os filtros podem ser combinados.\n\n' +
          '**Filtro por opção:** use o parâmetro `option[ID]=valor1,valor2` direto na URL, ' +
          'onde ID é o id da opção. Exemplo: `/v1/product/search?option[5]=GG,PP` ' +
          'acha os produtos cuja opção 5 tem o valor GG ou PP. ' +
          '(Esse filtro não aparece na lista abaixo porque o Swagger não monta nomes ' +
          'variáveis; teste-o pelo navegador ou pelo curl.)',
        parameters: [
          ...paginationParams,
          {
            name: 'match',
            in: 'query',
            description: 'Texto procurado no nome ou na descrição',
            schema: { type: 'string', example: 'nike' },
          },
          {
            name: 'category_ids',
            in: 'query',
            description: 'Ids de categorias, separados por vírgula',
            schema: { type: 'string', example: '1,3' },
          },
          {
            name: 'price-range',
            in: 'query',
            description: 'Faixa de preço (campo price) no formato mínimo-máximo',
            schema: { type: 'string', example: '100-200' },
          },
        ],
        responses: {
          200: {
            description: 'Página de produtos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                    total: { type: 'integer', example: 2 },
                    limit: { type: 'integer', example: 12 },
                    page: { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          400: errorResponse('Parâmetro de busca inválido'),
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cadastra um produto (com imagens, opções e categorias)',
        description:
          'As imagens vão em base64 e são salvas em `public/media`. ' +
          'Tudo é gravado junto: se algo falhar, nada é salvo.',
        security: secured,
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ProductCreate' } },
          },
        },
        responses: {
          201: {
            description: 'Produto criado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Product' } },
            },
          },
          400: errorResponse('Dados inválidos ou categoria inexistente'),
          401: unauthorized,
        },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Busca um produto pelo id',
        parameters: [idParam('produto')],
        responses: {
          200: {
            description: 'Produto encontrado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Product' } },
            },
          },
          404: errorResponse('Produto não encontrado'),
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza um produto',
        description:
          'Os campos `name`, `slug`, `price` e `price_with_discount` são sempre obrigatórios; ' +
          'os demais só mudam se forem enviados.\n\n' +
          '**Imagens:** sem `id` = nova (precisa de `type` e `content` em base64); ' +
          'com `id` e `deleted: true` = apagada; com `id` e `content` em base64 = troca o arquivo; ' +
          'com `id` e `content` sendo uma URL = já existe, nada muda.\n\n' +
          '**Opções:** sem `id` = nova; com `id` e `deleted: true` = apagada; ' +
          'com `id` e outros campos = só os campos enviados são atualizados.\n\n' +
          '**Categorias:** se `category_ids` vier, substitui as categorias do produto; ' +
          'se não vier, elas continuam como estão.\n\n' +
          'Se qualquer parte falhar, nada é gravado.',
        security: secured,
        parameters: [idParam('produto')],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ProductUpdate' } },
          },
        },
        responses: {
          204: { description: 'Atualizado com sucesso (sem corpo)' },
          400: errorResponse(
            'Dados inválidos, categoria inexistente ou imagem/opção que não pertence ao produto'
          ),
          401: unauthorized,
          404: errorResponse('Produto não encontrado'),
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Exclui um produto',
        description:
          'Apaga também as imagens (inclusive os arquivos em `public/media`), as opções ' +
          'e as ligações com categorias.',
        security: secured,
        parameters: [idParam('produto')],
        responses: {
          204: { description: 'Excluído com sucesso (sem corpo)' },
          401: unauthorized,
          404: errorResponse('Produto não encontrado'),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Cole o token devolvido por POST /v1/user/token (sem a palavra Bearer)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Descrição do erro' } },
      },

      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'teste@email.com' },
          password: { type: 'string', example: '123456' },
        },
      },
      Token: {
        type: 'object',
        properties: { token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' } },
      },

      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          firstname: { type: 'string', example: 'Teste' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'teste@email.com' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'Teste' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'teste@email.com' },
          password: { type: 'string', example: '123456' },
          confirmPassword: { type: 'string', example: '123456' },
        },
      },
      UserUpdate: {
        type: 'object',
        required: ['firstname', 'surname', 'email'],
        properties: {
          firstname: { type: 'string', example: 'Teste' },
          surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', example: 'teste@email.com' },
        },
      },

      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Calçados' },
          slug: { type: 'string', example: 'calcados' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Calçados' },
          slug: { type: 'string', example: 'calcados' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },

      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          content: {
            type: 'string',
            example: 'http://localhost:3000/media/83e3c8e1-f3a3-47aa-a92f-6efd9925e77c.png',
          },
        },
      },
      ProductOption: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['39', '40', '41'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Tênis Nike Air Force' },
          slug: { type: 'string', example: 'tenis-nike-air-force' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Tênis clássico, confortável e resistente.' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 3] },
          images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
          options: { type: 'array', items: { $ref: '#/components/schemas/ProductOption' } },
        },
      },

      // Imagem enviada no cadastro ou na atualização
      ImageInput: {
        type: 'object',
         example: {
          type: 'image/png',
          content:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        },
        properties: {
          id: { type: 'integer', description: 'Só na atualização: id da imagem existente' },
          type: {
            type: 'string',
            enum: ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'],
            example: 'image/png',
          },
          content: {
            type: 'string',
            description: 'Imagem em base64 (ou a URL atual, na atualização)',
            example:
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          },
          deleted: { type: 'boolean', description: 'Só na atualização: true apaga a imagem' },
        },
      },
      // Opção enviada no cadastro ou na atualização
      OptionInput: {
        type: 'object',
        example: {
          title: 'Tamanho',
          shape: 'square',
          radius: 4,
          type: 'text',
          values: ['39', '40', '41'],
        },
        properties: {
          id: { type: 'integer', description: 'Só na atualização: id da opção existente' },
          title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['39', '40', '41'] },
          deleted: { type: 'boolean', description: 'Só na atualização: true apaga a opção' },
        },
      },

      ProductCreate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Tênis Nike Air Force' },
          slug: { type: 'string', example: 'tenis-nike-air-force' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Tênis clássico, confortável e resistente.' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 3] },
          images: { type: 'array', items: { $ref: '#/components/schemas/ImageInput' } },
          options: { type: 'array', items: { $ref: '#/components/schemas/OptionInput' } },
        },
      },
      ProductUpdate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Camiseta Adidas Básica Premium' },
          slug: { type: 'string', example: 'camiseta-adidas-basica' },
          stock: { type: 'integer', example: 20 },
          description: { type: 'string', example: 'Camiseta de algodão, leve e confortável.' },
          price: { type: 'number', example: 89.9 },
          price_with_discount: { type: 'number', example: 69.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 3] },
          images: { type: 'array', items: { $ref: '#/components/schemas/ImageInput' } },
          options: { type: 'array', items: { $ref: '#/components/schemas/OptionInput' } },
        },
      },
    },
  },
}