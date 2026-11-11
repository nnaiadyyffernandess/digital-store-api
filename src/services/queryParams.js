// Lê e valida os parâmetros de paginação (limit e page) da query string
function parsePagination(query) {
  const limit = query.limit === undefined ? 12 : Number(query.limit)
  const page = query.page === undefined ? 1 : Number(query.page)

  const validLimit = Number.isInteger(limit) && (limit === -1 || limit > 0)
  const validPage = Number.isInteger(page) && page > 0

  if (!validLimit || !validPage) {
    return { error: 'Os parâmetros limit e page são inválidos' }
  }

  // Com limit = -1 busca todos os itens, e o page não tem efeito
  return {
    limit,
    page: limit === -1 ? 1 : page,
    offset: limit === -1 ? 0 : (page - 1) * limit,
  }
}

// Lê o parâmetro fields (ex.: fields=name,slug) e confere se os campos existem
function parseFields(query, allowedFields) {
  if (query.fields === undefined) {
    return { attributes: undefined }
  }

  const fields = String(query.fields)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)

  const invalid = fields.filter((field) => !allowedFields.includes(field))

  if (fields.length === 0 || invalid.length > 0) {
    return { error: 'O parâmetro fields contém campos inválidos' }
  }

  return { attributes: fields }
}

module.exports = { parsePagination, parseFields }