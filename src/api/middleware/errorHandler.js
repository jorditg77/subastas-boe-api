export function errorHandler(error, request, reply) {
  // Errores de validación de Zod: entrada del cliente incorrecta => 400.
  if (error.name === 'ZodError') {
    request.log.info({ code: 'VALIDATION_ERROR' }, 'Invalid request');
    return reply.status(400).send({
      error: 'Parámetros de petición no válidos',
      code: 'VALIDATION_ERROR',
      details: error.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  // Errores con statusCode conocido (rate limit 429, 4xx de cliente, etc.):
  // no son fallos del servidor, así que se registran como info, no como error,
  // para no llenar el log (y el disco) de falsos positivos.
  if (error.statusCode) {
    if (error.statusCode >= 500) {
      request.log.error(error, 'Server error');
    } else {
      request.log.info({ statusCode: error.statusCode, code: error.code }, 'Client error');
    }
    return reply.status(error.statusCode).send({
      error: error.message || 'Request error',
      code: error.code,
    });
  }

  // Sin statusCode => error inesperado del servidor.
  request.log.error(error, 'Unhandled error');
  return reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
