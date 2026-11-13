// Cliente HTTP mínimo para la API de FoodService.
async function solicitar(ruta, { method = 'GET', body, token } = {}) {
  const res = await fetch(`/api${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const datos = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error((datos && datos.error) || 'Error de comunicación con el servidor');
  return datos;
}

export const api = {
  registrar: (nombre, email, password) => solicitar('/auth/register', { method: 'POST', body: { nombre, email, password } }),
  login: (email, password) => solicitar('/auth/login', { method: 'POST', body: { email, password } }),
  restaurantes: () => solicitar('/restaurantes'),
  calificar: (id, nota, token) => solicitar(`/restaurantes/${id}/calificaciones`, { method: 'POST', body: { nota }, token })
};
