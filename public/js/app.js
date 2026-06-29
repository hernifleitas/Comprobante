/**
 * app.js
 * Script principal del lado del cliente.
 * Recopila información del dispositivo silenciosamente y la envía al backend.
 * El visitante solo ve un mensaje de agradecimiento.
 */

// ==================== VARIABLES GLOBALES ====================

// Almacena toda la información recopilada del dispositivo
const deviceData = {
  ip: null,
  country: null,
  region: null,
  city: null,
  isp: null,
  browser: null,
  browserVersion: null,
  os: null,
  osVersion: null,
  deviceType: null,
  deviceBrand: null,
  deviceModel: null,
  screenResolution: null,
  language: null,
  timezone: null,
  connectionType: null,
  gpsLatitude: null,
  gpsLongitude: null,
  visitDate: null
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Muestra un mensaje de estado en la interfaz.
 * @param {string} message - Texto a mostrar
 * @param {string} type - Tipo: 'info', 'success' o 'error'
 */
function showStatus(message, type = 'info') {
  const statusMessage = document.getElementById('statusMessage');
  const statusText = document.getElementById('statusText');

  if (!statusText || !statusMessage) return;

  statusText.textContent = message;

  statusMessage.className = 'status-message';
  if (type === 'success') {
    statusMessage.classList.add('status-message--success');
  } else if (type === 'error') {
    statusMessage.classList.add('status-message--error');
  }
}

// ==================== OBTENER IP Y GEOLOCALIZACION POR IP ====================

/**
 * Obtiene la dirección IP pública usando ipify.org.
 * Luego obtiene geolocalización aproximada usando ip-api.com.
 */
async function fetchIPAndGeoLocation() {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    deviceData.ip = ipData.ip;
  } catch (error) {
    console.warn('Error al obtener IP:', error);
  }
}

// ==================== DETECCION DE NAVEGADOR Y SO ====================

/**
 * Detecta navegador y SO usando User-Agent clásico y User-Agent Client Hints.
 */
async function detectBrowserAndOS() {
  const userAgent = navigator.userAgent;

  // Detectar navegador
  const browserPatterns = [
    { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
    { name: 'Opera', pattern: /(?:OPR|Opera)\/([\d.]+)/ },
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
    { name: 'Internet Explorer', pattern: /(?:MSIE |Trident.*rv:)([\d.]+)/ }
  ];

  for (const { name, pattern } of browserPatterns) {
    const match = userAgent.match(pattern);
    if (match) {
      deviceData.browser = name;
      deviceData.browserVersion = match[1];
      break;
    }
  }

  // Detectar SO
  if (userAgent.includes('Windows NT 10')) {
    deviceData.os = 'Windows';
    deviceData.osVersion = '10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    deviceData.os = 'Windows';
    deviceData.osVersion = '8.1';
  } else if (userAgent.includes('Windows NT 6.1')) {
    deviceData.os = 'Windows';
    deviceData.osVersion = '7';
  } else if (userAgent.includes('Windows')) {
    deviceData.os = 'Windows';
    deviceData.osVersion = 'Desconocida';
  } else if (userAgent.includes('Mac OS X')) {
    deviceData.os = 'macOS';
    const macMatch = userAgent.match(/Mac OS X ([\d_]+)/);
    deviceData.osVersion = macMatch ? macMatch[1].replace(/_/g, '.') : 'Desconocida';
  } else if (userAgent.includes('Android')) {
    deviceData.os = 'Android';
    const androidMatch = userAgent.match(/Android ([\d.]+)/);
    deviceData.osVersion = androidMatch ? androidMatch[1] : 'Desconocida';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    deviceData.os = 'iOS';
    const iosMatch = userAgent.match(/OS ([\d_]+)/);
    deviceData.osVersion = iosMatch ? iosMatch[1].replace(/_/g, '.') : 'Desconocida';
  } else if (userAgent.includes('Linux')) {
    deviceData.os = 'Linux';
    deviceData.osVersion = 'Desconocida';
  } else if (userAgent.includes('CrOS')) {
    deviceData.os = 'Chrome OS';
    deviceData.osVersion = 'Desconocida';
  }

  // Detectar tipo de dispositivo
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    deviceData.deviceType = /iPad|iPod|Tablet/i.test(userAgent) ? 'Tablet' : 'Movil';
  } else {
    deviceData.deviceType = 'PC';
  }

  // Intentar usar User-Agent Client Hints (más preciso)
  if (navigator.userAgentData) {
    try {
      const brands = navigator.userAgentData.brands;
      if (brands && brands.length > 0) {
        const brand = brands.find(
          b => !b.brand.includes('Not') && !b.brand.includes('Brand')
        );
        if (brand) {
          deviceData.browser = brand.brand;
          deviceData.browserVersion = brand.version;
        }
      }

      if (navigator.userAgentData.platform) {
        deviceData.os = navigator.userAgentData.platform;
      }

      if (navigator.userAgentData.mobile !== undefined) {
        deviceData.deviceType = navigator.userAgentData.mobile ? 'Movil' : 'PC';
      }
    } catch (error) {
      console.warn('User-Agent Client Hints no disponible:', error);
    }
  }
}

// ==================== DETECCION DE MARCA Y MODELO ====================

/**
 * Mapa de patrones para identificar marcas y modelos específicos
 * parseando el User-Agent.
 */
const DEVICE_PATTERNS = {
  // iPhone - todos los modelos conocidos
  iphone: {
    brand: 'Apple',
    patterns: [
      { model: 'iPhone 16 Pro Max', regex: /iPhone16,2/ },
      { model: 'iPhone 16 Pro', regex: /iPhone16,1/ },
      { model: 'iPhone 16 Plus', regex: /iPhone15,5/ },
      { model: 'iPhone 16', regex: /iPhone15,4/ },
      { model: 'iPhone 15 Pro Max', regex: /iPhone15,3/ },
      { model: 'iPhone 15 Pro', regex: /iPhone15,2/ },
      { model: 'iPhone 15 Plus', regex: /iPhone15,5/ },
      { model: 'iPhone 15', regex: /iPhone15,4/ },
      { model: 'iPhone 14 Pro Max', regex: /iPhone14,3/ },
      { model: 'iPhone 14 Pro', regex: /iPhone14,2/ },
      { model: 'iPhone 14 Plus', regex: /iPhone14,4/ },
      { model: 'iPhone 14', regex: /iPhone14,1/ },
      { model: 'iPhone 13 Pro Max', regex: /iPhone14,3/ },
      { model: 'iPhone 13 Pro', regex: /iPhone14,2/ },
      { model: 'iPhone 13', regex: /iPhone14,1/ },
      { model: 'iPhone 13 mini', regex: /iPhone14,4/ },
      { model: 'iPhone 12 Pro Max', regex: /iPhone13,3/ },
      { model: 'iPhone 12 Pro', regex: /iPhone13,2/ },
      { model: 'iPhone 12', regex: /iPhone13,1/ },
      { model: 'iPhone 12 mini', regex: /iPhone13,4/ },
      { model: 'iPhone SE (3rd gen)', regex: /iPhone14,6/ },
      { model: 'iPhone SE (2nd gen)', regex: /iPhone12,8/ },
      { model: 'iPhone 11 Pro Max', regex: /iPhone12,5/ },
      { model: 'iPhone 11 Pro', regex: /iPhone12,3/ },
      { model: 'iPhone 11', regex: /iPhone12,1/ },
      { model: 'iPhone XS Max', regex: /iPhone11,6/ },
      { model: 'iPhone XS', regex: /iPhone11,2/ },
      { model: 'iPhone XR', regex: /iPhone11,8/ },
      { model: 'iPhone X', regex: /iPhone10,3|iPhone10,6/ },
      { model: 'iPhone 8 Plus', regex: /iPhone10,2|iPhone10,5/ },
      { model: 'iPhone 8', regex: /iPhone10,1|iPhone10,4/ },
    ]
  },
  // Samsung Galaxy
  samsung: {
    brand: 'Samsung',
    patterns: [
      { model: 'Galaxy S24 Ultra', regex: /SM-S928/ },
      { model: 'Galaxy S24+', regex: /SM-S926/ },
      { model: 'Galaxy S24', regex: /SM-S921/ },
      { model: 'Galaxy S23 Ultra', regex: /SM-S918/ },
      { model: 'Galaxy S23+', regex: /SM-S916/ },
      { model: 'Galaxy S23', regex: /SM-S911/ },
      { model: 'Galaxy S22 Ultra', regex: /SM-S908/ },
      { model: 'Galaxy S22+', regex: /SM-S906/ },
      { model: 'Galaxy S22', regex: /SM-S901/ },
      { model: 'Galaxy S21 Ultra', regex: /SM-G998/ },
      { model: 'Galaxy S21+', regex: /SM-G996/ },
      { model: 'Galaxy S21', regex: /SM-G991/ },
      { model: 'Galaxy S20 FE', regex: /SM-G780|SM-G781/ },
      { model: 'Galaxy S20 Ultra', regex: /SM-G988/ },
      { model: 'Galaxy S20+', regex: /SM-G986/ },
      { model: 'Galaxy S20', regex: /SM-G981/ },
      { model: 'Galaxy A54', regex: /SM-A546/ },
      { model: 'Galaxy A53', regex: /SM-A536/ },
      { model: 'Galaxy A52', regex: /SM-A526|SM-A525|SM-A528/ },
      { model: 'Galaxy A34', regex: /SM-A346/ },
      { model: 'Galaxy A33', regex: /SM-A336/ },
      { model: 'Galaxy A14', regex: /SM-A146|SM-A145|SM-A143/ },
      { model: 'Galaxy A13', regex: /SM-A136|SM-A135/ },
      { model: 'Galaxy A04', regex: /SM-A046|SM-A045|SM-A043/ },
      { model: 'Galaxy Note 20 Ultra', regex: /SM-N986/ },
      { model: 'Galaxy Note 20', regex: /SM-N981/ },
      { model: 'Galaxy Z Fold5', regex: /SM-F946/ },
      { model: 'Galaxy Z Flip5', regex: /SM-F731/ },
      { model: 'Galaxy Z Fold4', regex: /SM-F936/ },
      { model: 'Galaxy Z Flip4', regex: /SM-F721/ },
    ]
  },
  // Motorola
  motorola: {
    brand: 'Motorola',
    patterns: [
      { model: 'Moto G84', regex: /moto g84/i },
      { model: 'Moto G82', regex: /moto g82/i },
      { model: 'Moto G72', regex: /moto g72/i },
      { model: 'Moto G71', regex: /moto g71/i },
      { model: 'Moto G62', regex: /moto g62/i },
      { model: 'Moto G52', regex: /moto g52/i },
      { model: 'Moto G42', regex: /moto g42/i },
      { model: 'Moto G32', regex: /moto g32/i },
      { model: 'Moto G22', regex: /moto g22/i },
      { model: 'Moto G20', regex: /moto g20/i },
      { model: 'Moto G10', regex: /moto g10/i },
      { model: 'Moto G Power (2024)', regex: /moto g power 2024/i },
      { model: 'Moto G Power (2023)', regex: /moto g power 2023/i },
      { model: 'Moto G Stylus (2024)', regex: /moto g stylus 2024/i },
      { model: 'Moto G Stylus (2023)', regex: /moto g stylus 2023/i },
      { model: 'Moto E14', regex: /moto e14/i },
      { model: 'Moto E13', regex: /moto e13/i },
      { model: 'Moto E22', regex: /moto e22/i },
      { model: 'Moto E20', regex: /moto e20/i },
      { model: 'Edge 50 Pro', regex: /edge 50 pro/i },
      { model: 'Edge 50 Ultra', regex: /edge 50 ultra/i },
      { model: 'Edge 40 Pro', regex: /edge 40 pro/i },
      { model: 'Edge 40', regex: /edge 40/i },
      { model: 'Edge 30 Pro', regex: /edge 30 pro/i },
      { model: 'Edge 30', regex: /edge 30/i },
      { model: 'Razr 2024', regex: /razr 2024/i },
      { model: 'Razr 2023', regex: /razr 2023/i },
    ]
  },
  // Xiaomi / Redmi / POCO
  xiaomi: {
    brand: 'Xiaomi',
    patterns: [
      { model: 'Xiaomi 14', regex: /xiaomi 14(?! ultra)/i },
      { model: 'Xiaomi 14 Ultra', regex: /xiaomi 14 ultra/i },
      { model: 'Xiaomi 13', regex: /xiaomi 13(?! ultra| pro)/i },
      { model: 'Xiaomi 13 Pro', regex: /xiaomi 13 pro/i },
      { model: 'Xiaomi 13 Ultra', regex: /xiaomi 13 ultra/i },
      { model: 'Xiaomi 12', regex: /xiaomi 12(?!s)/i },
      { model: 'Xiaomi 12S', regex: /xiaomi 12s/i },
      { model: 'Redmi Note 13 Pro+', regex: /redmi note 13 pro/i },
      { model: 'Redmi Note 13 Pro', regex: /redmi note 13(?! pro)/i },
      { model: 'Redmi Note 13', regex: /redmi note 13/i },
      { model: 'Redmi Note 12 Pro+', regex: /redmi note 12 pro/i },
      { model: 'Redmi Note 12 Pro', regex: /redmi note 12(?! pro)/i },
      { model: 'Redmi Note 12', regex: /redmi note 12/i },
      { model: 'Redmi Note 11', regex: /redmi note 11/i },
      { model: 'Redmi 13C', regex: /redmi 13c/i },
      { model: 'Redmi 13', regex: /redmi 13(?!c)/i },
      { model: 'Redmi 12C', regex: /redmi 12c/i },
      { model: 'Redmi 12', regex: /redmi 12(?!c)/i },
      { model: 'POCO X6 Pro', regex: /poco x6 pro/i },
      { model: 'POCO X6', regex: /poco x6(?! pro)/i },
      { model: 'POCO F6 Pro', regex: /poco f6 pro/i },
      { model: 'POCO F6', regex: /poco f6(?! pro)/i },
      { model: 'POCO M6 Pro', regex: /poco m6 pro/i },
      { model: 'POCO M6', regex: /poco m6(?! pro)/i },
      { model: 'POCO C65', regex: /poco c65/i },
    ]
  },
  // Huawei
  huawei: {
    brand: 'Huawei',
    patterns: [
      { model: 'P60 Pro', regex: /P60 Pro/i },
      { model: 'P60', regex: /P60(?! Pro)/i },
      { model: 'P50 Pro', regex: /P50 Pro/i },
      { model: 'P50', regex: /P50(?! Pro)/i },
      { model: 'Mate 60 Pro', regex: /Mate 60 Pro/i },
      { model: 'Mate 60', regex: /Mate 60(?! Pro)/i },
      { model: 'Nova 12', regex: /Nova 12/i },
      { model: 'Nova 11', regex: /Nova 11/i },
      { model: 'Y9a', regex: /Y9a/i },
      { model: 'Y9s', regex: /Y9s/i },
    ]
  },
  // Google Pixel
  google: {
    brand: 'Google',
    patterns: [
      { model: 'Pixel 9 Pro', regex: /Pixel 9 Pro/i },
      { model: 'Pixel 9', regex: /Pixel 9(?! Pro)/i },
      { model: 'Pixel 8 Pro', regex: /Pixel 8 Pro/i },
      { model: 'Pixel 8', regex: /Pixel 8(?! Pro)/i },
      { model: 'Pixel 7a', regex: /Pixel 7a/i },
      { model: 'Pixel 7 Pro', regex: /Pixel 7 Pro/i },
      { model: 'Pixel 7', regex: /Pixel 7(?!a| Pro)/i },
      { model: 'Pixel 6a', regex: /Pixel 6a/i },
      { model: 'Pixel 6 Pro', regex: /Pixel 6 Pro/i },
      { model: 'Pixel 6', regex: /Pixel 6(?!a| Pro)/i },
      { model: 'Pixel 5', regex: /Pixel 5/i },
      { model: 'Pixel 4a', regex: /Pixel 4a/i },
      { model: 'Pixel 4', regex: /Pixel 4(?!a)/i },
    ]
  },
  // OnePlus
  oneplus: {
    brand: 'OnePlus',
    patterns: [
      { model: 'OnePlus 12', regex: /OnePlus 12/i },
      { model: 'OnePlus 11', regex: /OnePlus 11/i },
      { model: 'OnePlus 10 Pro', regex: /OnePlus 10 Pro/i },
      { model: 'OnePlus 10T', regex: /OnePlus 10T/i },
      { model: 'OnePlus 9', regex: /OnePlus 9(?! Pro|R)/i },
      { model: 'OnePlus Nord CE 4', regex: /Nord CE 4/i },
      { model: 'OnePlus Nord CE 3', regex: /Nord CE 3/i },
      { model: 'OnePlus Nord N30', regex: /Nord N30/i },
    ]
  },
  // OPPO
  oppo: {
    brand: 'OPPO',
    patterns: [
      { model: 'Find X7', regex: /Find X7/i },
      { model: 'Find X6', regex: /Find X6/i },
      { model: 'Reno 11', regex: /Reno 11/i },
      { model: 'Reno 10', regex: /Reno 10/i },
      { model: 'A78', regex: /A78/i },
      { model: 'A38', regex: /A38/i },
    ]
  },
  // Vivo
  vivo: {
    brand: 'Vivo',
    patterns: [
      { model: 'Vivo X100', regex: /X100/i },
      { model: 'Vivo X90', regex: /X90/i },
      { model: 'Vivo V30', regex: /V30/i },
      { model: 'Vivo V29', regex: /V29/i },
      { model: 'Vivo Y36', regex: /Y36/i },
      { model: 'Vivo Y27', regex: /Y27/i },
    ]
  },
  // Realme
  realme: {
    brand: 'Realme',
    patterns: [
      { model: 'Realme GT 5 Pro', regex: /GT 5 Pro/i },
      { model: 'Realme GT 5', regex: /GT 5(?! Pro)/i },
      { model: 'Realme 12 Pro+', regex: /12 Pro\+/i },
      { model: 'Realme 12 Pro', regex: /12 Pro/i },
      { model: 'Realme 12', regex: /12(?! Pro)/i },
      { model: 'Realme C67', regex: /C67/i },
      { model: 'Realme C55', regex: /C55/i },
    ]
  },
  // Nothing Phone
  nothing: {
    brand: 'Nothing',
    patterns: [
      { model: 'Nothing Phone (2a)', regex: /Phone\s*\(2a\)/i },
      { model: 'Nothing Phone (2)', regex: /Phone\s*\(2\)/i },
      { model: 'Nothing Phone (1)', regex: /Phone\s*\(1\)/i },
    ]
  }
};

/**
 * Intenta identificar marca y modelo del dispositivo parseando el User-Agent.
 * Usa Client Hints si está disponible, y como fallback busca patrones conocidos.
 */
async function detectDeviceBrandAndModel() {
  let foundModel = false;

  // 1. Intentar con User-Agent Client Hints (la forma más precisa para Android)
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    try {
      const highEntropyValues = await navigator.userAgentData.getHighEntropyValues([
        'platform',
        'platformVersion',
        'model',
        'uaFullVersion'
      ]);

      if (highEntropyValues.model) {
        // Client Hints nos dio el modelo exacto (solo Android Chrome)
        deviceData.deviceBrand = highEntropyValues.model;
        deviceData.deviceModel = highEntropyValues.model;
        foundModel = true;
      }

      // Actualizar SO con información más precisa
      if (highEntropyValues.platform) {
        deviceData.os = highEntropyValues.platform;
      }
      if (highEntropyValues.platformVersion) {
        deviceData.osVersion = highEntropyValues.platformVersion;
      }
      if (highEntropyValues.uaFullVersion) {
        deviceData.browserVersion = highEntropyValues.uaFullVersion;
      }
    } catch (error) {
      console.warn('Error al obtener high entropy values:', error);
    }
  }

  // 2. Si Client Hints no dio modelo, intentar parsear el User-Agent
  if (!foundModel) {
    const userAgent = navigator.userAgent;

    for (const [key, brandData] of Object.entries(DEVICE_PATTERNS)) {
      for (const { model, regex } of brandData.patterns) {
        if (regex.test(userAgent)) {
          deviceData.deviceBrand = brandData.brand;
          deviceData.deviceModel = model;
          foundModel = true;
          break;
        }
      }
      if (foundModel) break;
    }

    // Si aún no se encontró, intentar extraer algo genérico
    if (!foundModel) {
      // Para iOS, saber que es iPhone es suficiente
      if (/iPhone/.test(userAgent)) {
        deviceData.deviceBrand = 'Apple';
        deviceData.deviceModel = 'iPhone (modelo no especifico)';
      } else if (/iPad/.test(userAgent)) {
        deviceData.deviceBrand = 'Apple';
        deviceData.deviceModel = 'iPad';
      } else if (userAgent.includes('Android')) {
        // Intentar extraer marca genérica del UA
        const brandMatch = userAgent.match(/;\s*(Samsung|Motorola|Xiaomi|Huawei|OnePlus|OPPO|Vivo|Realme|Nothing|LG|Sony|Nokia)/i);
        if (brandMatch) {
          deviceData.deviceBrand = brandMatch[1];
          deviceData.deviceModel = 'Modelo no especifico';
        } else {
          deviceData.deviceBrand = 'Desconocida';
          deviceData.deviceModel = 'Modelo no especifico';
        }
      } else if (userAgent.includes('Windows')) {
        deviceData.deviceBrand = 'PC';
        deviceData.deviceModel = 'Computadora de escritorio/portatil';
      } else if (userAgent.includes('Mac')) {
        deviceData.deviceBrand = 'Apple';
        deviceData.deviceModel = 'Mac';
      } else {
        deviceData.deviceBrand = 'No disponible';
        deviceData.deviceModel = 'No disponible';
      }
    }
  }
}

// ==================== RESOLUCION DE PANTALLA ====================

/**
 * Obtiene la resolución de pantalla actual.
 */
function detectScreenResolution() {
  const width = screen.width;
  const height = screen.height;
  const dpr = window.devicePixelRatio || 1;

  deviceData.screenResolution = `${width}x${height} (${dpr}x DPR)`;
}

// ==================== IDIOMA Y ZONA HORARIA ====================

/**
 * Detecta idioma del navegador y zona horaria del sistema.
 */
function detectLanguageAndTimezone() {
  deviceData.language = navigator.language || navigator.userLanguage || 'Desconocido';

  try {
    deviceData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    deviceData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Desconocida';
  }
}

// ==================== TIPO DE CONEXION ====================

/**
 * Detecta el tipo de conexión de red si la API Network Information está disponible.
 */
function detectConnectionType() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    deviceData.connectionType = connection.effectiveType || connection.type || 'Desconocido';
  } else {
    deviceData.connectionType = 'API no disponible';
  }
}

// ==================== FECHA Y HORA ====================

/**
 * Registra la fecha y hora actual de la visita.
 */
function detectVisitDate() {
  const now = new Date();
  deviceData.visitDate = now.toISOString();
}

// ==================== GPS / GEOLOCATION API ====================

/**
 * Solicita permiso para acceder a la ubicación GPS.
 * Retorna una Promise que resuelve con las coordenadas o null si no se pudo obtener.
 * @param {number} timeout - Tiempo maximo de espera en ms
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
function requestGPSPermission(timeout = 15000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    // Temporizador de seguridad: si no resuelve a tiempo, continua sin GPS
    const timer = setTimeout(() => {
      resolve(null);
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        deviceData.gpsLatitude = coords.lat;
        deviceData.gpsLongitude = coords.lng;
        resolve(coords);
      },
      (error) => {
        clearTimeout(timer);
        console.log('GPS no disponible:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 300000
      }
    );
  });
}

// ==================== ENVIAR DATOS AL BACKEND ====================

/**
 * Envía la información recopilada al backend via API REST.
 */
async function sendToBackend() {
  try {
    const response = await fetch('/api/visits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deviceData)
    });

    const result = await response.json();

    if (result.success) {
      showStatus('Visita registrada correctamente.', 'success');
    } else {
      showStatus('Error al registrar la visita.', 'error');
    }
  } catch (error) {
    console.error('Error al enviar datos al backend:', error);
    showStatus('Error de conexion con el servidor.', 'error');
  }
}

// ==================== INICIALIZACION ====================

/**
 * Función principal que se ejecuta al cargar la página.
 * Recopila información silenciosamente y la envía al backend.
 */
async function init() {
  showStatus('Procesando...');

  // Ejecutar todas las detecciones en paralelo
  await Promise.all([
    fetchIPAndGeoLocation(),
    detectBrowserAndOS(),
    detectScreenResolution(),
    detectLanguageAndTimezone(),
    detectConnectionType(),
    detectVisitDate()
  ]);

  // Detectar marca y modelo (requiere await para Client Hints)
  await detectDeviceBrandAndModel();

  // Solicitar GPS y esperar respuesta (max 15 segundos)
  // Si el usuario acepta, se guardan las coordenadas
  // Si deniega o no responde, se continua sin GPS
  await requestGPSPermission(15000);

  // Enviar datos al backend (ya con o sin GPS)
  sendToBackend();
}

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
