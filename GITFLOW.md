# Gitflow del proyecto

## Ramas

- `master`: versión estable. Recibe releases y hotfixes mediante pull request.
- `develop`: integración de funcionalidades para la próxima versión.
- `feature/<nombre>`: trabajo concreto, nace de `develop` y vuelve a `develop`.
- `release/<version>`: estabilización de una versión, nace de `develop` y se integra en `master` y después en `develop`.
- `hotfix/<nombre>`: corrección urgente, nace de `master` y se integra en `master` y después en `develop`.

Las ramas release y hotfix se crean cuando son necesarias. No son ramas permanentes. Se conserva el nombre `master` que ya utiliza el repositorio.

## Nueva funcionalidad

Con el árbol de trabajo limpio (guardar antes el trabajo pendiente en su rama):

```sh
git fetch origin
git switch --no-track -c feature/mi-funcionalidad origin/develop
# Realizar cambios y ejecutar los tests
npm run check
git add <archivos-del-cambio>
git commit -m "feat: descripción del cambio"
git push -u origin feature/mi-funcionalidad
```

Abrir un pull request con destino `develop`. Revisar el diff y exigir que `Tests y compilación` pase antes de integrarlo. Usar merge commit para conservar el historial de ramas. Después del merge, eliminar la rama de funcionalidad si no se necesita más.

## Preparar una versión

```sh
git fetch origin
git switch --no-track -c release/1.0.0 origin/develop
```

Actualizar versión y notas de cambios según corresponda, corregir solo incidencias de estabilización, ejecutar `npm run check`, guardar los cambios y publicar la rama:

```sh
git push -u origin release/1.0.0
```

Crear PR hacia `master`. Tras integrarlo, etiquetar el commit exacto publicado con `v1.0.0` y publicar el tag. Crear también PR de `master` hacia `develop` para incorporar todas las correcciones. Eliminar la rama release cuando ambas integraciones estén completas.

## Corrección urgente

```sh
git fetch origin
git switch --no-track -c hotfix/descripcion origin/master
```

Corregir, añadir prueba de regresión, ejecutar `npm run check`, hacer commit y publicar la rama. Crear PR hacia `master`, etiquetar la nueva versión y crear PR de `master` hacia `develop`. Si hay una release abierta, incorporar también la corrección en ella.

## Protección y validación

El workflow `.github/workflows/checks.yml` valida cada push y PR. En GitHub, configurar protección de `master` y `develop`: exigir PR, revisión y el check `Tests y compilación`, y bloquear force pushes y eliminaciones. Estas protecciones requieren configuración en GitHub; no se activan al crear ramas o archivos.

Los comandos anteriores usan Git estándar; no requieren instalar la extensión `git-flow`. La configuración local `gitflow.*` también queda preparada con estos nombres y prefijos para quien utilice esa extensión. Esa configuración es local y no se transmite al clonar; este documento es la referencia compartida.

En worktrees, una rama solo puede estar activa en un checkout a la vez. Crear ramas desde `origin/develop` o `origin/master` evita tener que cambiar la rama del checkout principal.
