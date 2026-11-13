// Capa de acceso a datos: SQLite (archivo en disco) mediante better-sqlite3.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const RESTAURANTES_INICIALES = [
  { nombre: 'FoodService Centro', direccion: 'Av. Francisco de Aguirre 123, La Serena', cocina: 'Chilena' },
  { nombre: 'FoodService Costanera', direccion: 'Av. del Mar 2100, La Serena', cocina: 'Pescados y mariscos' },
  { nombre: 'FoodService Coquimbo', direccion: 'Aldunate 850, Coquimbo', cocina: 'Parrilla' },
  { nombre: 'FoodService Mall Plaza', direccion: 'Av. Alberto Solari 1400, La Serena', cocina: 'Italiana' },
  { nombre: 'FoodService Valle', direccion: 'Calle Principal 45, Vicuña', cocina: 'Vegetariana' }
];

function crearConexion(rutaArchivo) {
  const ruta = rutaArchivo || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'foodservice.db');
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const db = new Database(ruta);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      direccion TEXT NOT NULL,
      cocina TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      restaurante_id INTEGER NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
      nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 10),
      creado_en TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (cliente_id, restaurante_id)
    );
  `);

  const total = db.prepare('SELECT COUNT(*) AS n FROM restaurantes').get().n;
  if (total === 0) {
    const insertar = db.prepare('INSERT INTO restaurantes (nombre, direccion, cocina) VALUES (?, ?, ?)');
    const cargar = db.transaction((lista) => lista.forEach((r) => insertar.run(r.nombre, r.direccion, r.cocina)));
    cargar(RESTAURANTES_INICIALES);
  }

  return db;
}

module.exports = { crearConexion, RESTAURANTES_INICIALES };
