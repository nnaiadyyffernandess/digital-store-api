const fs = require('fs/promises')
const path = require('path')
const { randomUUID } = require('crypto')

// Pasta onde as imagens enviadas em base64 são salvas
const MEDIA_DIR = path.join(__dirname, '..', '..', 'public', 'media')

// Tipos de imagem aceitos e a extensão de arquivo de cada um
const EXTENSIONS = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

// Remove o prefixo "data:image/png;base64," caso ele venha junto
function cleanBase64(content) {
  return content.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
}

// Confere se uma imagem ({ type, content }) é válida; devolve a mensagem de erro ou null.
// Com requireType = false (troca de imagem existente), o tipo é opcional.
function validateImage(image, requireType = true) {
  if (!image) {
    return 'Imagem inválida'
  }
  if (requireType || image.type !== undefined) {
    if (typeof image.type !== 'string' || !EXTENSIONS[image.type]) {
      return 'Tipo de imagem inválido (use png, jpg, jpeg, gif ou webp)'
    }
  }
  if (typeof image.content !== 'string' || !BASE64_REGEX.test(cleanBase64(image.content))) {
    return 'O conteúdo da imagem deve estar em base64'
  }
  return null
}

// Salva a imagem no disco e devolve o nome do arquivo (que é guardado no banco).
// Se o tipo não vier, usa a extensão padrão informada (a da imagem que está sendo trocada).
async function saveBase64Image(image, defaultExtension = 'png') {
  await fs.mkdir(MEDIA_DIR, { recursive: true })
  const extension = EXTENSIONS[image.type] || defaultExtension
  const filename = `${randomUUID()}.${extension}`
  const buffer = Buffer.from(cleanBase64(image.content), 'base64')
  await fs.writeFile(path.join(MEDIA_DIR, filename), buffer)
  return filename
}

// Apaga uma imagem do disco (ignora se o arquivo não existir mais)
async function deleteImageFile(filename) {
  await fs.rm(path.join(MEDIA_DIR, path.basename(filename)), { force: true })
}

// Monta a URL pública da imagem
function imageUrl(baseUrl, filename) {
  return `${baseUrl}/media/${filename}`
}

module.exports = { MEDIA_DIR, validateImage, saveBase64Image, deleteImageFile, imageUrl }