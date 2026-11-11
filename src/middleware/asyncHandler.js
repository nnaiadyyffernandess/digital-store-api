// Envolve um controller assíncrono: se der erro, ele cai no tratamento de erros do Express
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}