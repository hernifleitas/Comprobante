/**
 * routes/visits.js
 * Rutas de la API REST para gestionar visitas.
 * - POST /api/visits: Registrar una nueva visita
 * - GET /api/visits: Obtener todas las visitas (con filtros)
 * - GET /api/visits/count: Contar el total de visitas
 */

const express = require('express');
const router = express.Router();
const http = require('http');
const db = require('../database');

/**
 * Obtiene geolocalización por IP usando ip-api.com (HTTP, sin API key).
 * El backend puede hacer HTTP sin problemas de mixed content.
 */
function geoLookupByIP(ip) {
  return new Promise((resolve) => {
    if (!ip) { resolve(null); return; }

    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const geo = JSON.parse(data);
          if (geo.status === 'success') {
            resolve({
              country: geo.country || null,
              region: geo.regionName || null,
              city: geo.city || null,
              isp: geo.isp || null
            });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * POST /api/visits
 * Registra una nueva visita en la base de datos.
 * Recibe un JSON con la información del dispositivo.
 */
router.post('/', async (req, res) => {
  try {
    let {
      ip, country, region, city, isp,
      browser, browserVersion, os, osVersion,
      deviceType, deviceBrand, deviceModel,
      screenResolution, language, timezone,
      connectionType, gpsLatitude, gpsLongitude
    } = req.body;

    // Obtener IP del request si no viene en el body
    if (!ip) {
      ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || null;
      if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
    }

    // Si no hay ubicación por GPS, buscar por IP en el backend
    if (!gpsLatitude && !country && ip) {
      const geo = await geoLookupByIP(ip);
      if (geo) {
        country = geo.country;
        region = geo.region;
        city = geo.city;
        isp = geo.isp;
      }
    }

    // Preparar inserción
    const stmt = db.prepare(`
      INSERT INTO visits (
        ip_address, country, region, city, isp,
        browser, browser_version, os, os_version,
        device_type, device_brand, device_model,
        screen_resolution, language, timezone,
        connection_type, gps_latitude, gps_longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      ip || null, country || null, region || null,
      city || null, isp || null,
      browser || null, browserVersion || null,
      os || null, osVersion || null,
      deviceType || null, deviceBrand || null,
      deviceModel || null, screenResolution || null,
      language || null, timezone || null,
      connectionType || null,
      gpsLatitude || null, gpsLongitude || null
    );

    res.status(201).json({
      success: true,
      message: 'Visita registrada correctamente',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error al registrar visita:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la visita'
    });
  }
});

/**
 * GET /api/visits
 * Obtiene todas las visitas registradas.
 * Soporta filtros por fecha (desde/hasta) y por IP.
 * Parámetros de query:
 *   - from: fecha de inicio (YYYY-MM-DD)
 *   - to: fecha de fin (YYYY-MM-DD)
 *   - ip: filtrar por dirección IP
 *   - limit: número máximo de resultados (default 100)
 *   - offset: desplazamiento para paginación (default 0)
 */
router.get('/', (req, res) => {
  try {
    const { from, to, ip, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM visits WHERE 1=1';
    const params = [];

    // Filtro por fecha de inicio
    if (from) {
      query += ' AND visit_date >= ?';
      params.push(from);
    }

    // Filtro por fecha de fin
    if (to) {
      query += ' AND visit_date <= ?';
      params.push(to + ' 23:59:59');
    }

    // Filtro por IP
    if (ip) {
      query += ' AND ip_address = ?';
      params.push(ip);
    }

    // Ordenar por fecha descendente
    query += ' ORDER BY visit_date DESC';

    // Paginación
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const visits = db.prepare(query).all(...params);

    // Obtener total para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM visits WHERE 1=1';
    const countParams = [];

    if (from) {
      countQuery += ' AND visit_date >= ?';
      countParams.push(from);
    }
    if (to) {
      countQuery += ' AND visit_date <= ?';
      countParams.push(to + ' 23:59:59');
    }
    if (ip) {
      countQuery += ' AND ip_address = ?';
      countParams.push(ip);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      visits,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error al obtener visitas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las visitas'
    });
  }
});

/**
 * GET /api/visits/count
 * Retorna el total de visitas registradas.
 */
router.get('/count', (req, res) => {
  try {
    const { total } = db.prepare('SELECT COUNT(*) as total FROM visits').get();
    res.json({ success: true, total });
  } catch (error) {
    console.error('Error al contar visitas:', error);
    res.status(500).json({ success: false, message: 'Error al contar visitas' });
  }
});

module.exports = router;
