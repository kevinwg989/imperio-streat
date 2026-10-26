function errorHandler(err, req, res, next) {
  console.error('💥 Erro no servidor:', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.clientMessage || (statusCode === 500 ? 'Ocorreu um erro interno no servidor.' : err.message);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { devDetails: err.message })
  });
}

function notFoundHandler(req, res) {
  if (req.accepts('html')) {
    return res.status(404).sendFile(require('path').resolve(__dirname, '../../public/404.html'));
  }
  res.status(404).json({
    success: false,
    error: 'Recurso não encontrado.'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
