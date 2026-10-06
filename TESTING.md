# Validación de cambios

Requisitos: Node.js 24 y npm. Desde la raíz, instalar las dependencias y generar el cliente Prisma:

```sh
npm ci --prefix backend
npm ci --prefix frontend
```

En `backend`, ejecutar `npm run prisma:generate` con `DATABASE_URL` definida (Prisma carga también `backend/.env`). Para generar el cliente basta una URL ficticia; no se conecta a la base de datos:

```sh
cd backend
DATABASE_URL=postgresql://test:test@localhost:5432/test npm run prisma:generate
cd ..
```

Antes de entregar cualquier cambio:

```sh
npm run check
```

El comando ejecuta los tests unitarios del backend, las pruebas HTTP, los tests del frontend sin modo observación y las compilaciones de producción. Devuelve un código de error si falla cualquier paso. Las pruebas HTTP abren un puerto local temporal; necesitan un entorno que permita escuchar en localhost.

GitHub Actions ejecuta el mismo comando en cada push y pull request mediante `.github/workflows/checks.yml`. Para impedir merges con fallos, configurar en GitHub la protección de rama y exigir el check `Tests y compilación`; el archivo del workflow por sí solo no configura esa protección.

## Cobertura actual

- Repositorio: rechazo de archivos `.env` reales versionados y comprobación de que Git ignora sus variantes en cualquier directorio. Las plantillas `.env.example` se pueden versionar.
- Integridad de negocio: conflictos de horarios e instructores, borrado de relaciones, snapshots de clases, reservas duplicadas, aforo, cuota activa, caducidad, cómputo conjunto de clases y eventos, semana permitida y cancelación por propietario.
- Seguridad HTTP: JWT ausentes, inválidos, caducados o firmados con otra clave; cookies mal formadas; autorización administrativa; rechazo de campos extra y suplantación; aislamiento de reservas; CORS; cookies HttpOnly/Secure/SameSite; logout y límite de peticiones de login.
- Credenciales: hash verificable de contraseña, normalización de registro, rechazo de duplicados, respuestas sin contraseña y mensaje genérico ante credenciales incorrectas.
- Pagos: propietario de la sesión, pago completo, cuota válida y precio calculado en servidor. Stripe está simulado: no hay cobros ni llamadas externas.
- Frontend: contenedor de rutas, guards, peticiones con cookies, almacenamiento corrupto, login fallido, limpieza al salir y formulario de login (envío, errores, texto HTML no interpretado).

## Alcance y límites

Los tests HTTP cargan el AppModule, guards, servicios y configuración de producción, sustituyendo Prisma por un doble de prueba. La función `configureApp` se comparte con el arranque real para evitar diferencias de CORS o validación. No necesitan base de datos ni secretos reales. Las pruebas de frontend utilizan Angular y jsdom.

Esta batería es una base de regresión, no una garantía completa de seguridad. No prueba PostgreSQL real, migraciones, carreras entre reservas simultáneas, Stripe real ni recorridos completos en un navegador. Esos escenarios requieren pruebas adicionales de integración y navegador. Tampoco sustituye una auditoría de dependencias o una revisión de seguridad.

Al cambiar una regla de negocio o corregir un fallo, añadir un caso que reproduzca el comportamiento relevante y ejecutar `npm run check`. Mantener datos y fechas controlados; no conectar tests a servicios de producción ni omitir pruebas para obtener un resultado verde.

Comandos individuales:

```sh
npm --prefix backend run test:ci
npm --prefix backend run test:e2e -- --runInBand
npm --prefix frontend run test:ci
npm run build
```
