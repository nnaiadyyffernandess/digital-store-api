const request = require('supertest')
const app = require('../src/app')
const {
  sequelize,
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../src/models')

// Imagem PNG de 1 pixel em base64, usada só nos testes
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

// Dados compartilhados entre os testes (os testes rodam em ordem)
let token
let categoryId
let productId

beforeAll(async () => {
  // Trava de segurança: só roda se estiver no banco de testes
  if (!sequelize.config.database.endsWith('_test')) {
    throw new Error('Os testes só podem rodar no banco de testes!')
  }

  // Limpa as tabelas, dos dados dependentes para os principais
  await ProductImage.destroy({ where: {} })
  await ProductOption.destroy({ where: {} })
  await ProductCategory.destroy({ where: {} })
  await Product.destroy({ where: {} })
  await Category.destroy({ where: {} })
  await User.destroy({ where: {} })
})

afterAll(async () => {
  await sequelize.close()
})

describe('Usuários e autenticação', () => {
  const user = {
    firstname: 'Teste',
    surname: 'Jest',
    email: 'jest@email.com',
    password: '123456',
    confirmPassword: '123456',
  }

  it('cadastra um usuário e não devolve a senha', async () => {
    const res = await request(app).post('/v1/user').send(user)

    expect(res.status).toBe(201)
    expect(res.body.email).toBe(user.email)
    expect(res.body.password).toBeUndefined()
  })

  it('recusa o cadastro quando as senhas são diferentes', async () => {
    const res = await request(app)
      .post('/v1/user')
      .send({ ...user, email: 'outro@email.com', confirmPassword: '999999' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('As senhas não conferem')
  })

  it('faz login e devolve um token', async () => {
    const res = await request(app)
      .post('/v1/user/token')
      .send({ email: user.email, password: user.password })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()

    token = res.body.token
  })

  it('recusa o login com senha errada', async () => {
    const res = await request(app)
      .post('/v1/user/token')
      .send({ email: user.email, password: 'senha-errada' })

    expect(res.status).toBe(400)
  })

  it('bloqueia uma rota protegida quando não há token', async () => {
    const res = await request(app).post('/v1/category').send({ name: 'X', slug: 'x' })

    expect(res.status).toBe(401)
  })
})

describe('Categorias', () => {
  it('cria uma categoria', async () => {
    const res = await request(app)
      .post('/v1/category')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Camisetas', slug: 'camisetas', use_in_menu: true })

    expect(res.status).toBe(201)
    expect(res.body.slug).toBe('camisetas')

    categoryId = res.body.id
  })

  it('devolve 404 para uma categoria que não existe', async () => {
    const res = await request(app).get('/v1/category/999999')

    expect(res.status).toBe(404)
  })
})

describe('Produtos', () => {
  it('recusa o cadastro de um produto sem nome', async () => {
    const res = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'sem-nome', price: 10, price_with_discount: 9 })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('O nome é obrigatório')
  })

  it('cadastra um produto com categoria, imagem e opção', async () => {
    const res = await request(app)
      .post('/v1/product')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Camiseta Jest',
        slug: 'camiseta-jest',
        price: 79.9,
        price_with_discount: 59.9,
        category_ids: [categoryId],
        images: [{ type: 'image/png', content: PNG_BASE64 }],
        options: [
          { title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: ['P', 'M'] },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.category_ids).toEqual([categoryId])
    expect(res.body.images).toHaveLength(1)
    expect(res.body.options[0].values).toEqual(['P', 'M'])

    productId = res.body.id
  })

  it('encontra o produto na busca por texto', async () => {
    const res = await request(app).get('/v1/product/search?match=Camiseta')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.data[0].id).toBe(productId)
  })

  it('atualiza o preço do produto', async () => {
    const update = await request(app)
      .put(`/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Camiseta Jest',
        slug: 'camiseta-jest',
        price: 89.9,
        price_with_discount: 69.9,
      })

    expect(update.status).toBe(204)

    const res = await request(app).get(`/v1/product/${productId}`)

    expect(res.body.price).toBe(89.9)
  })

  it('exclui o produto e ele deixa de existir', async () => {
    const remove = await request(app)
      .delete(`/v1/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(remove.status).toBe(204)

    const res = await request(app).get(`/v1/product/${productId}`)

    expect(res.status).toBe(404)
  })
})