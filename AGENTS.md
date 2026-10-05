# Validación del proyecto

- Antes de entregar cambios de código, ejecutar `npm run check` desde la raíz. Incluye tests del backend, HTTP, frontend y compilaciones de producción.
- Consultar `TESTING.md` para instalar dependencias, generar Prisma y conocer el alcance de las pruebas.
- Si se modifica una regla de negocio o se corrige un fallo, añadir o adaptar una prueba de regresión pertinente.
- No desactivar tests ni rebajar sus comprobaciones para ocultar fallos. Informar de cualquier validación que no se haya podido ejecutar y su causa.
- Las pruebas deben usar datos controlados y servicios simulados o aislados, nunca producción.

# Flujo Git

- Seguir `GITFLOW.md`: `master` es estable y `develop` integra funcionalidades.
- Crear funcionalidades en `feature/<nombre>` desde `origin/develop`; dirigir sus PR a `develop`.
- Crear releases desde `develop` y hotfixes desde `master`, solo cuando haya trabajo de ese tipo.
- No trabajar directamente sobre `master` o `develop`. Conservar los cambios pendientes al cambiar de rama.
