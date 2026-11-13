import { useEffect, useState } from 'react';
import { api } from './api.js';

function Acceso({ onLogin }) {
  const [modo, setModo] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setMensaje(null);
    setCargando(true);
    try {
      if (modo === 'registro') {
        await api.registrar(nombre, email, password);
        setModo('login');
        setPassword('');
        setMensaje({ tipo: 'ok', texto: 'Cuenta creada. Ahora inicia sesión.' });
      } else {
        const { token, cliente } = await api.login(email, password);
        onLogin({ token, cliente });
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="acceso">
      <div className="marca">
        <span className="logo">FS</span>
        <h1>FoodService</h1>
        <p>Reserva y califica los restaurantes de la cadena.</p>
      </div>
      <form className="tarjeta" onSubmit={enviar} data-cy="form-acceso">
        <div className="pestanas">
          <button type="button" className={modo === 'login' ? 'activa' : ''} onClick={() => setModo('login')} data-cy="tab-login">Iniciar sesión</button>
          <button type="button" className={modo === 'registro' ? 'activa' : ''} onClick={() => setModo('registro')} data-cy="tab-registro">Registrarse</button>
        </div>
        {modo === 'registro' && (
          <label>Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required data-cy="input-nombre" />
          </label>
        )}
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-cy="input-email" />
        </label>
        <label>Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-cy="input-password" />
        </label>
        {mensaje && <p className={`aviso ${mensaje.tipo}`} data-cy="mensaje">{mensaje.texto}</p>}
        <button type="submit" className="principal" disabled={cargando} data-cy="btn-enviar">
          {cargando ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
    </main>
  );
}

function Restaurantes({ sesion, onLogout }) {
  const [lista, setLista] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [nota, setNota] = useState(0);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => api.restaurantes().then(setLista).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  useEffect(() => { cargar(); }, []);

  async function calificar() {
    setMensaje(null);
    try {
      const r = await api.calificar(seleccionado.id, nota, sesion.token);
      setMensaje({ tipo: 'ok', texto: `Calificaste ${seleccionado.nombre} con un ${r.nota}. Nuevo promedio: ${r.promedio}` });
      setNota(0);
      cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  return (
    <div className="panel">
      <header className="barra">
        <div className="marca-chica"><span className="logo">FS</span> FoodService</div>
        <div className="usuario" data-cy="usuario-actual">
          <strong data-cy="usuario-nombre">{sesion.cliente.nombre}</strong>
          <span data-cy="usuario-email">{sesion.cliente.email}</span>
          <button onClick={onLogout} data-cy="btn-salir">Cerrar sesión</button>
        </div>
      </header>

      <main className="contenido">
        <h2 data-cy="saludo">Hola, {sesion.cliente.nombre}</h2>
        <p className="sub">Selecciona un restaurante para calificarlo de 1 a 10.</p>

        <ul className="grilla" data-cy="lista-restaurantes">
          {lista.map((r) => (
            <li key={r.id}>
              <button
                className={`restaurante ${seleccionado && seleccionado.id === r.id ? 'sel' : ''}`}
                onClick={() => { setSeleccionado(r); setNota(0); setMensaje(null); }}
                data-cy="restaurante"
              >
                <span className="nombre">{r.nombre}</span>
                <span className="detalle">{r.cocina} · {r.direccion}</span>
                <span className="promedio">{r.votos > 0 ? `★ ${r.promedio} (${r.votos})` : 'Sin calificaciones'}</span>
              </button>
            </li>
          ))}
        </ul>

        {seleccionado && (
          <section className="tarjeta calificar" data-cy="panel-calificar">
            <h3>Calificar {seleccionado.nombre}</h3>
            <div className="notas">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} className={nota === n ? 'activa' : ''} onClick={() => setNota(n)} data-cy={`nota-${n}`}>{n}</button>
              ))}
            </div>
            <button className="principal" disabled={!nota} onClick={calificar} data-cy="btn-calificar">Enviar calificación</button>
          </section>
        )}
        {mensaje && <p className={`aviso ${mensaje.tipo}`} data-cy="mensaje">{mensaje.texto}</p>}
      </main>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('fs-sesion')) || null; } catch { return null; }
  });

  function guardar(s) {
    try { s ? sessionStorage.setItem('fs-sesion', JSON.stringify(s)) : sessionStorage.removeItem('fs-sesion'); } catch { /* sin almacenamiento */ }
    setSesion(s);
  }

  return sesion ? <Restaurantes sesion={sesion} onLogout={() => guardar(null)} /> : <Acceso onLogin={guardar} />;
}
