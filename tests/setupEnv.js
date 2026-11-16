// Faz os testes usarem o banco de testes (digital_store_test), nunca o de verdade
process.env.NODE_ENV = 'test'

// Chave usada para assinar os tokens durante os testes
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo_de_teste'