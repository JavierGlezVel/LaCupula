# La Cúpula

Aplicación web para gestionar una academia de jiu-jitsu: usuarios y perfiles, clases, horarios, sesiones, reservas de asistencia, eventos, anuncios y cuotas con checkout de Stripe en modo de prueba.

El frontend está construido con Angular 21; la API REST utiliza NestJS 11, Prisma 7 y PostgreSQL 16. La autenticación usa JWT en una cookie HttpOnly y las operaciones administrativas se protegen en el backend.

## Estructura

- `frontend/`: interfaz Angular y tests con Vitest.
- `backend/`: API NestJS, esquema y migraciones Prisma, seed y tests con Jest/Supertest.
- `docker-compose.yml`: PostgreSQL local con volumen persistente.
- `.github/workflows/checks.yml`: tests y compilaciones en cada push y pull request.
- [TESTING.md](TESTING.md): validación y límites de la cobertura.
- [GITFLOW.md](GITFLOW.md): trabajo con ramas, releases y hotfixes.

## Requisitos para ejecutar en local

- Git, Node.js **24** y npm **11**.
- Docker con Docker Compose v2 y el servicio Docker en ejecución.
- Puertos disponibles: **4200** (web), **3000** (API) y **5433** (PostgreSQL).
- Conexión a Internet para instalar paquetes y descargar la imagen de PostgreSQL. La compilación de producción también descarga fuentes de Google.

Angular CLI y Prisma se instalan con las dependencias del proyecto; no hace falta instalarlos globalmente. Docker ejecuta solo la base de datos; la API y la web se arrancan con npm.

## Instalación inicial

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/JavierGlezVel/LaCupula.git
cd LaCupula
git switch master
npm ci --prefix backend
npm ci --prefix frontend
```

Si ya tienes el repositorio, usa tu carpeta existente. Guarda cualquier trabajo pendiente antes de cambiar de rama o actualizarla.

### 2. Configurar el backend

```bash
cp -n backend/.env.example backend/.env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

En `backend/.env`, sustituye el valor de `JWT_SECRET` por el resultado del último comando. No publiques ese archivo. `cp -n` conserva un `.env` existente: revisa sus valores si ya tenías uno.

| Variable | Valor para desarrollo local |
| --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/la_cupula_db?schema=public` |
| `PORT` | `3000` |
| `NODE_ENV` | `development` |
| `JWT_SECRET` | El secreto aleatorio generado |
| `JWT_EXPIRATION` | `24h` |
| `CORS_ORIGIN` | `http://localhost:4200` |
| `FRONTEND_URL` | `http://localhost:4200` |
| `PROTECTED_ADMIN_EMAIL` | `admin@example.com` |
| `STRIPE_SECRET_KEY` | Opcional: clave de prueba `sk_test_...` para probar pagos |

El backend carga `backend/.env` al arrancar desde esa carpeta. El `.env` de la raíz no sustituye este archivo. En el frontend, la URL de la API está en `frontend/src/app/core/api/api.config.ts` y apunta a `http://localhost:3000`.

### 3. Arrancar PostgreSQL

Desde la raíz:

```bash
docker compose up -d postgres
docker compose exec postgres pg_isready -U postgres -d la_cupula_db
```

Espera a que indique `accepting connections`. Si aún está arrancando, repite la segunda orden. PostgreSQL queda accesible desde el equipo en el puerto **5433**, no en el 5432. Las credenciales de Compose son exclusivamente para desarrollo local.

### 4. Generar Prisma y aplicar las migraciones

```bash
cd backend
npm run prisma:generate
npx prisma migrate deploy
```

Esto aplica las migraciones versionadas sin crear nuevas migraciones ni reiniciar la base de datos.

### 5. Crear datos de demostración (opcional, solo en una base nueva)

Todavía dentro de `backend/`:

```bash
npx prisma db seed
```

**El seed actual borra usuarios, sesiones, horarios, anuncios y clases antes de insertar ejemplos. Úsalo únicamente en una base local nueva y vacía.** No es una actualización segura de datos: si ya hay reservas, también puede fallar por las relaciones existentes.

El seed crea el acceso de demostración:

- Email: `admin@example.com`
- Contraseña: `admin123`

Son credenciales públicas de desarrollo. El seed incluye dos clases, horarios y anuncios; sus sesiones de ejemplo están fechadas en abril de 2026, así que no aparecerán necesariamente en la semana actual. Para probar reservas actuales, crea o genera sesiones de la semana desde la aplicación y utiliza un usuario con cuota activa.

Sin seed puedes registrarte en `/signup`, pero ese registro no crea un administrador.

## Arrancar la aplicación

Abre dos terminales desde la raíz del repositorio.

**Terminal 1 — API:**

```bash
cd backend
npm run start:dev
```

**Terminal 2 — web:**

```bash
cd frontend
npm start
```

Abre **http://localhost:4200**. El login está en **http://localhost:4200/login**.

Comprueba la API:

```bash
curl http://localhost:3000/health
```

Devuelve JSON como `{"ok":true,"classes":2}` si se ha ejecutado el seed. El número cambia según las clases existentes. Este endpoint consulta PostgreSQL, por lo que comprueba también la conexión de la API con la base de datos.

Usa `localhost` tanto para la web como para la API; mezclarlo con `127.0.0.1` puede afectar a las cookies y a CORS. Mantén `NODE_ENV=development` para este arranque mediante HTTP local.

### Pagos de prueba

La web y la API pueden arrancar sin una clave Stripe, pero el checkout requiere `STRIPE_SECRET_KEY=sk_test_...` en `backend/.env`. Reinicia la API después de cambiarla. La implementación actual rechaza claves de producción y está preparada para pruebas, no para cobros reales. Las reservas requieren cuota activa y sesiones dentro de la semana y antes de que caduque la cuota.

## Validar cambios

Desde la raíz, después de instalar dependencias y generar Prisma:

```bash
npm run check
```

Ejecuta tests del backend, pruebas HTTP, tests del frontend y compilaciones de producción. La base inicial consta de **67 tests**; Prisma y Stripe están simulados en esas pruebas. No requieren PostgreSQL en ejecución ni claves reales. Consulta [TESTING.md](TESTING.md) para conocer el alcance.

Los avisos de tamaño de CSS y del bundle de Angular no impiden actualmente la compilación. No deben confundirse con errores de tests.

## Parar y volver a arrancar

Detén API y frontend con `Ctrl+C`. Para detener la base de datos conservando sus datos:

```bash
docker compose stop postgres
```

Para volver a arrancarla, ejecuta `docker compose up -d postgres` y después los dos comandos de inicio de la aplicación. No necesitas repetir el seed. Los datos están en el volumen `postgres_data`; no uses `docker compose down -v` si quieres conservarlos.

## Problemas frecuentes

- **`JWT_SECRET is not defined`:** comprueba `backend/.env` y arranca la API desde `backend/`.
- **No conecta a PostgreSQL:** revisa `docker compose ps`, `docker compose logs postgres` y la URL con puerto 5433. Las credenciales de Compose no cambian un volumen que ya se hubiera inicializado con otras credenciales.
- **Falta el cliente Prisma:** ejecuta `npm run prisma:generate` desde `backend/`.
- **Puerto ocupado:** libera el puerto o ajusta la configuración. Si cambias el puerto de la API, actualiza también `api.config.ts`; si cambias el de la web, actualiza `CORS_ORIGIN` y `FRONTEND_URL`.
- **Checkout sin configurar:** añade una clave Stripe de prueba; no es necesaria para arrancar el resto de la aplicación.
- **No aparecen sesiones actuales:** el seed contiene fechas fijas; crea sesiones para la semana que quieras probar.

## Flujo de desarrollo

`master` contiene las releases y `develop` integra funcionalidades. Cada cambio se trabaja en `feature/<nombre>` y se integra por PR en `develop`. Las releases parten de `develop`, se integran por PR en `master`, se etiquetan y se sincronizan de vuelta a `develop`. Consulta [GITFLOW.md](GITFLOW.md).
