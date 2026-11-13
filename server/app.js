// API REST de FoodService (Express).
const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearApp(db, opciones = {}) {
  const secreto = opciones.jwtSecret || process.env.JWT_SECRET || 'foodservice-dev-secret';
  const app = express();
  app.use(express.json());

  // Middleware de autenticación (Bearer token)
  function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) return res.status(401).json({ error: 'Debe iniciar sesión' });
    try {
      req.cliente = jwt.verify(token, secreto);
      return next();
    } catch {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
  }

  app.get('/api/health', (_req, res) => res.json({ estado: 'ok', version: process.env.APP_VERSION || process.env.RENDER_GIT_COMMIT || 'local' }));

  // Registro de cliente
  app.post('/api/auth/register', (req, res) => {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email inválido' });
    if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const correo = String(email).trim().toLowerCase();
    if (db.prepare('SELECT id FROM clientes WHERE email = ?').get(correo)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const hash = bcrypt.hashSync(String(password), 10);
    const info = db.prepare('INSERT INTO clientes (nombre, email, password_hash) VALUES (?, ?, ?)')
      .run(String(nombre).trim(), correo, hash);
    return res.status(201).json({ id: info.lastInsertRowid, nombre: String(nombre).trim(), email: correo });
  });

  // Inicio de sesión
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cliente = db.prepare('SELECT * FROM clientes WHERE email = ?').get(String(email || '').trim().toLowerCase());
    if (!cliente || !bcrypt.compareSync(String(password || ''), cliente.password_hash)) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const token = jwt.sign({ id: cliente.id, nombre: cliente.nombre, email: cliente.email }, secreto, { expiresIn: '8h' });
    return res.json({ token, cliente: { id: cliente.id, nombre: cliente.nombre, email: cliente.email } });
  });

  // Eliminación de cliente (solo el propio cliente)
  app.delete('/api/clientes/:id', autenticar, (req, res) => {
    const id = Number(req.params.id);
    if (id !== req.cliente.id) return res.status(403).json({ error: 'No autorizado' });
    const info = db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.status(204).end();
  });

  // Listado de restaurantes con promedio de notas
  app.get('/api/restaurantes', (_req, res) => {
    const filas = db.prepare(`
      SELECT r.id, r.nombre, r.direccion, r.cocina,
             ROUND(AVG(c.nota), 1) AS promedio, COUNT(c.id) AS votos
      FROM restaurantes r LEFT JOIN calificaciones c ON c.restaurante_id = r.id
      GROUP BY r.id ORDER BY r.id`).all();
    res.json(filas);
  });

  // Calificar un restaurante (1 a 10). Si ya calificó, se actualiza la nota.
  app.post('/api/restaurantes/:id/calificaciones', autenticar, (req, res) => {
    const restauranteId = Number(req.params.id);
    const nota = Number((req.body || {}).nota);
    if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
      return res.status(400).json({ error: 'La nota debe ser un número entero entre 1 y 10' });
    }
    if (!db.prepare('SELECT id FROM restaurantes WHERE id = ?').get(restauranteId)) {
      return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    db.prepare(`
      INSERT INTO calificaciones (cliente_id, restaurante_id, nota) VALUES (?, ?, ?)
      ON CONFLICT (cliente_id, restaurante_id) DO UPDATE SET nota = excluded.nota, creado_en = datetime('now')`)
      .run(req.cliente.id, restauranteId, nota);
    const resumen = db.prepare('SELECT ROUND(AVG(nota), 1) AS promedio, COUNT(*) AS votos FROM calificaciones WHERE restaurante_id = ?')
      .get(restauranteId);
    return res.status(201).json({ restauranteId, nota, ...resumen });
  });

  // Frontend compilado (React) servido por el mismo proceso
  const dist = opciones.distDir || path.join(__dirname, '..', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  return app;
}

module.exports = { crearApp };
