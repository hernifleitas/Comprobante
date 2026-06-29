/**
 * database.js
 * Configuración y conexión a la base de datos SQLite.
 * Crea la tabla de visitas si no existe.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Crear carpeta data/ si no existe (necesario en Render)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ruta al archivo de base de datos
const DB_PATH = path.join(dataDir, 'visits.db');

// Crear conexión a la base de datos
const db = new Database(DB_PATH);

// Habilitar WAL para mejor rendimiento en lecturas concurrentes
db.pragma('journal_mode = WAL');

/**
 * Inicializa la base de datos creando la tabla de visitas
 * si no existe.
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      isp TEXT,
      browser TEXT,
      browser_version TEXT,
      os TEXT,
      os_version TEXT,
      device_type TEXT,
      device_brand TEXT,
      device_model TEXT,
      screen_resolution TEXT,
      language TEXT,
      timezone TEXT,
      connection_type TEXT,
      gps_latitude REAL,
      gps_longitude REAL,
      visit_date TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('Base de datos inicializada correctamente.');
}

// Inicializar al cargar el módulo
initDatabase();

module.exports = db;
