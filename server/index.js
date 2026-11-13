const { crearConexion } = require('./db');
const { crearApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const db = crearConexion();
const app = crearApp(db);

app.listen(PORT, () => {
  console.log(`FoodService escuchando en http://localhost:${PORT}`);
});
