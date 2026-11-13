# FoodService

Plataforma web de FoodService. Los clientes se registran, inician sesión, ven los restaurantes de la cadena y les ponen nota de 1 a 10. El repo trae una prueba de backend, una de frontend y un pipeline de GitHub Actions que despliega a Staging cuando las dos pasan.

## Stack

| Capa | Herramienta |
|---|---|
| Backend | Node.js 22 + Express, SQLite (better-sqlite3), bcrypt, JWT |
| Frontend | React 18 + Vite |
| Prueba Backend | Jest + Supertest (verifica la tabla `clientes` en SQLite) |
| Prueba Frontend | Cypress (login con usuario creado previamente) |
| Repositorio | Git + GitHub |
| Orquestador CI/CD | GitHub Actions (`.github/workflows/ci-cd.yml`) |
| Staging | Render (`render.yaml`, despliegue por Deploy Hook) |

## Ejecutar en local

```bash
npm install
npm run build        # compila el frontend en dist/
npm start            # API + frontend en http://localhost:3000
```

Para desarrollar con recarga automática, corre `npm run dev:api` y, en otra terminal, `npm run dev:web` (http://localhost:5173).

## Pruebas

```bash
npm run test:backend   # Jest: crea y elimina un cliente, verificando la BD
npm start &            # la prueba de Cypress necesita la app arriba
npm run test:frontend  # Cypress: login y datos del usuario en pantalla
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro (nombre, email, password) |
| POST | `/api/auth/login` | Inicio de sesión, devuelve JWT |
| GET | `/api/restaurantes` | Lista de restaurantes con promedio |
| POST | `/api/restaurantes/:id/calificaciones` | Califica de 1 a 10 (requiere token) |
| DELETE | `/api/clientes/:id` | Elimina la propia cuenta (requiere token) |
| GET | `/api/health` | Estado y versión desplegada |

## Pipeline

1. `backend-tests` y `frontend-tests` corren en paralelo en cada push y pull request.
2. `deploy-staging` corre en `main` cuando los dos jobs anteriores pasan. Llama al Deploy Hook de Render y espera a que `/api/health` devuelva el commit que se acaba de desplegar.

En GitHub hay que configurar lo siguiente (Settings → Secrets and variables → Actions):

- Secret `RENDER_DEPLOY_HOOK_URL`: Deploy Hook del servicio en Render.
- Variable `STAGING_URL`: URL pública del servicio (ej. `https://foodservice-staging.onrender.com`).
