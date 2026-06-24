export function errorHandler(error, request, reply) {
  request.log.error(error, 'Unhandled error');

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
