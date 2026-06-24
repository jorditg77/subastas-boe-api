export function errorHandler(error, request, reply) {
  request.log.error(error, 'Unhandled error');

  // Errores de validación de Zod: entrada del cliente incorrecta => 400.
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      error: 'Parámetros de petición no válidos',
      code: 'VALIDATION_ERROR',
      details: error.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.message || 'Request error',
      code: error.code,
    });
  }

  return reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
