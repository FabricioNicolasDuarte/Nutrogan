# Tests Nutrogan

Tres capas. Correr en este orden:

## 1. Unitarios (sin red)

```bash
npm run test:unit:run
```

Cubre: GDPV, KPIs de hacienda, CC INTA, matriz de roles, inventario de rutas del router, DataStore getters, cards.

## 2. Smoke funcional API (Supabase live)

```bash
npm run test:smoke
```

Autentica con `.env` + `NUTROGAN_SMOKE_EMAIL` / `NUTROGAN_SMOKE_PASSWORD` (opcionales; hay defaults de demo).

Prueba lectura de:

| Dominio | Qué valida |
|---------|------------|
| Auth | login password |
| Perfil / rol / establecimiento | membresía |
| Lotes | EN PASTO 100% cabezas con potrero |
| Potreros | geometría GIS |
| Evaluaciones | lectura + GDPV sample |
| Inventario | `inventario_items` |
| Agua | `fuentes_de_agua` |
| Lluvias | `registros_lluvia` |
| Notificaciones | `notificaciones_programadas` |
| Edges | market price, asistente-ia, analizar-ndvi, send-alert vacío, invite reachable |

Reporte: `docs/SMOKE_APP_RESULT.json`

Solo edges (más corto):

```bash
npm run smoke:edges
```

## 3. E2E UI (Cypress)

Contra producción (default) o local:

```bash
# producción
npm run test:e2e

# local (quasar dev en :9000)
set NUTROGAN_BASE_URL=http://localhost:9000
npm run test:e2e
```

Login con sesión real (opcional):

```bash
npx cypress run --env NUTROGAN_SMOKE_EMAIL=...,NUTROGAN_SMOKE_PASSWORD=...
```

## Todo junto

```bash
npm run test:all
```

= unitarios + smoke API. Cypress va aparte (`test:e2e`) porque abre browser.

## Notas

- No hay writes destructivos en smoke (no borra potreros ni crea usuarios).
- `send-alert` se prueba con `destinatarios: []` → respuesta “Sin destinatarios”.
- Credenciales: rotar password de smoke si estuvo en chat; preferir env vars.
