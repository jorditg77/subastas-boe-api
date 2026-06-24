export const BOE_BASE_URL = 'https://subastas.boe.es';
export const BOE_SEARCH_URL = `${BOE_BASE_URL}/subastas_ava.php`;
export const BOE_DETAIL_URL = `${BOE_BASE_URL}/detalleSubasta.php`;

// Códigos reales del formulario de búsqueda avanzada (subastas_ava.php),
// confirmados inspeccionando el formulario en vivo: no son '1'/'2'/'3' como
// cabría esperar, son los códigos internos de la base de datos del BOE.
export const BOE_ORIGIN = {
  TODOS: '',
  JUDICIAL: 'J',
  NOTARIAL: 'N',
  AEAT: 'A',
  OTRAS_ADMIN_TRIBUTARIAS: 'R',
  ADMIN_GENERALES: 'G',
};

export const BOE_STATUS = {
  CUALQUIERA: '',
  PROXIMA_APERTURA: 'PU',
  CELEBRANDOSE: 'EJ',
  SUSPENDIDA: 'SU',
  CANCELADA: 'CA',
  CONCLUIDA_PORTAL: 'PC',
  FINALIZADA_AUTORIDAD: 'FS',
};

export const BOE_BIEN_TIPO = {
  TODOS: '',
  INMUEBLES: 'I',
  VEHICULOS: 'V',
  MUEBLES: 'M',
};

// Pestañas reales de detalleSubasta.php (parámetro `ver`). idSub solo (sin
// idBus de sesión de búsqueda) es suficiente para que el portal resuelva la
// página, verificado en vivo.
export const BOE_TABS = {
  GENERAL: '1',
  AUTORIDAD: '2',
  BIENES: '3',
  RELACIONADOS: '4',
  PUJAS: '5',
};

export const PROVINCES = [
  { code: '01', name: 'Álava' },
  { code: '02', name: 'Albacete' },
  { code: '03', name: 'Alicante' },
  { code: '04', name: 'Almería' },
  { code: '05', name: 'Ávila' },
  { code: '06', name: 'Badajoz' },
  { code: '07', name: 'Illes Balears' },
  { code: '08', name: 'Barcelona' },
  { code: '09', name: 'Burgos' },
  { code: '10', name: 'Cáceres' },
  { code: '11', name: 'Cádiz' },
  { code: '12', name: 'Castellón' },
  { code: '13', name: 'Ciudad Real' },
  { code: '14', name: 'Córdoba' },
  { code: '15', name: 'A Coruña' },
  { code: '16', name: 'Cuenca' },
  { code: '17', name: 'Girona' },
  { code: '18', name: 'Granada' },
  { code: '19', name: 'Guadalajara' },
  { code: '20', name: 'Gipuzkoa' },
  { code: '21', name: 'Huelva' },
  { code: '22', name: 'Huesca' },
  { code: '23', name: 'Jaén' },
  { code: '24', name: 'León' },
  { code: '25', name: 'Lleida' },
  { code: '26', name: 'La Rioja' },
  { code: '27', name: 'Lugo' },
  { code: '28', name: 'Madrid' },
  { code: '29', name: 'Málaga' },
  { code: '30', name: 'Murcia' },
  { code: '31', name: 'Navarra' },
  { code: '32', name: 'Ourense' },
  { code: '33', name: 'Asturias' },
  { code: '34', name: 'Palencia' },
  { code: '35', name: 'Las Palmas' },
  { code: '36', name: 'Pontevedra' },
  { code: '37', name: 'Salamanca' },
  { code: '38', name: 'Santa Cruz de Tenerife' },
  { code: '39', name: 'Cantabria' },
  { code: '40', name: 'Segovia' },
  { code: '41', name: 'Sevilla' },
  { code: '42', name: 'Soria' },
  { code: '43', name: 'Tarragona' },
  { code: '44', name: 'Teruel' },
  { code: '45', name: 'Toledo' },
  { code: '46', name: 'Valencia' },
  { code: '47', name: 'Valladolid' },
  { code: '48', name: 'Bizkaia' },
  { code: '49', name: 'Zamora' },
  { code: '50', name: 'Zaragoza' },
  { code: '51', name: 'Ceuta' },
  { code: '52', name: 'Melilla' },
];

export const USER_AGENT = 'Mozilla/5.0 (compatible; SubastasBoeBot/0.1; +mailto:info@example.com)';
