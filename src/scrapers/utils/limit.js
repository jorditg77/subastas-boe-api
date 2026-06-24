import pLimit from 'p-limit';
import { env } from '../../config/index.js';

// Limitador GLOBAL de peticiones salientes hacia subastas.boe.es, compartido
// entre búsqueda y detalle. Es la salvaguarda clave del modelo: garantiza que,
// por muchas peticiones concurrentes que reciba la API, nunca se abran más de
// BOE_MAX_CONCURRENT_REQUESTS conexiones simultáneas al portal, evitando que
// el BOE bloquee la IP doméstica.
export const boeLimit = pLimit(env.boe.maxConcurrentRequests);
