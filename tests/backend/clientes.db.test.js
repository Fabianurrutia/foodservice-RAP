/**
 * Prueba de Backend: interacción con la base de datos.
 * Crea un cliente real a través de la API y verifica, consultando directamente
 * la tabla `clientes` de SQLite, que el registro quedó persistido (y con la
 * contraseña cifrada). Luego elimina el cliente y verifica que ya no existe.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const { crearConexion } = require('../../server/db');
const { crearApp } = require('../../server/app');

describe('Clientes - persistencia en base de datos', () => {
  let db;
  let app;
  let rutaDb;

  const cliente = {
    nombre: 'Camila Rojas',
    email: `camila.rojas+${Date.now()}@foodservice.cl`,
    password: 'Reserva2026'
  };

  beforeAll(() => {
    rutaDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'foodservice-')), 'test.db');
    db = crearConexion(rutaDb);
    app = crearApp(db, { jwtSecret: 'secreto-de-prueba' });
  });

  afterAll(() => {
    db.close();
    fs.rmSync(path.dirname(rutaDb), { recursive: true, force: true });
  });

  test('crea un cliente y luego lo elimina, verificando cada cambio en la tabla clientes', async () => {
    // 1. Creación vía API
    const registro = await request(app).post('/api/auth/register').send(cliente);
    expect(registro.status).toBe(201);
    expect(registro.body.email).toBe(cliente.email);

    // 2. Verificación directa en la base de datos
    const fila = db.prepare('SELECT * FROM clientes WHERE email = ?').get(cliente.email);
    expect(fila).toBeDefined();
    expect(fila.id).toBe(registro.body.id);
    expect(fila.nombre).toBe(cliente.nombre);
    expect(fila.password_hash).not.toBe(cliente.password); // nunca se guarda en texto plano
    expect(fila.password_hash).toMatch(/^\$2[aby]\$/);      // hash bcrypt

    // 3. Login para obtener el token del propio cliente
    const login = await request(app).post('/api/auth/login').send({ email: cliente.email, password: cliente.password });
    expect(login.status).toBe(200);
    const token = login.body.token;

    // 4. Eliminación vía API
    const borrado = await request(app).delete(`/api/clientes/${fila.id}`).set('Authorization', `Bearer ${token}`);
    expect(borrado.status).toBe(204);

    // 5. Verificación directa: el registro ya no existe
    const despues = db.prepare('SELECT COUNT(*) AS n FROM clientes WHERE id = ?').get(fila.id);
    expect(despues.n).toBe(0);
  });
});
