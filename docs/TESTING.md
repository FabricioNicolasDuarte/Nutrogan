# Tests Nutrogan

Tres capas. Correr en este orden:

## 1. Unitarios (sin red)

```bash
npm run test:unit:run
```

Cubre: GDPV, KPIs de hacienda, CC INTA, matriz de roles, inventario de rutas del router, DataStore getters, cards.

## 2. Smoke funcional API (Supabase live)

```bash
npm run test:smoke          # lectura + edges
npm run test:smoke:write    # CREATE / MOVE / DELETE / NDVI / mail real
```

`test:smoke:write` hace escrituras reales con tag `SMOKE-E2E-*` y limpia al final:

| Acción | Qué valida |
|--------|------------|
| Crear lote | insert + constraint objetivo |
| Mover lote smoke | A→B y vuelta + `movimientos_de_lotes` |
| Mover lote real | temp + restore inmediato |
| Evaluación / evento sanitario | create + delete |
| Lluvia | create |
| Inventario | create + update stock + deactivate |
| Agua | análisis + update estado |
| NDVI | edge Planetary Computer + persistido en potrero |
| Market / IA | edges |
| Alerta email | `send-alert` → Resend `success` + id (revisar bandeja) |
| Historial | `notificaciones_programadas` |

Reporte: `docs/SMOKE_WRITE_RESULT.json`

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

= unitarios + smoke lectura + smoke escritura. Cypress va aparte (`test:e2e`).

## Notas

- No hay writes destructivos en smoke (no borra potreros ni crea usuarios).
- `send-alert` se prueba con `destinatarios: []` → respuesta “Sin destinatarios”.
- Credenciales: rotar password de smoke si estuvo en chat; preferir env vars.
