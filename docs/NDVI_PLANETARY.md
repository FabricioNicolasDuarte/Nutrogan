# NDVI Nutrogan (alineado a SIGAG F4.3)

**Fecha:** 2026-09-29

## Qué cambió

Sentinel Hub (OAuth client credentials) **ya no se usa**. La edge `analizar-ndvi` replica la estrategia de SIGAG `agro-proxy`:

| Paso | Fuente |
|------|--------|
| 1 (opcional) | AgroMonitoring si existe secret `AGRO_API_KEY` |
| 2 (default) | **Microsoft Planetary Computer** · Sentinel-2 L2A (gratis, sin API key) |

## Deploy

```bash
npx supabase login   # cuenta con acceso a nutrogan-mvp
npx supabase functions deploy analizar-ndvi --project-ref cglogstrtjvbpsoaghib
npx supabase functions deploy send-alert --project-ref cglogstrtjvbpsoaghib
```

Secrets opcionales: `AGRO_API_KEY`. Ya no hacen falta `SENTINEL_CLIENT_ID` / `SENTINEL_CLIENT_SECRET`.

`send-alert` usa `https://www.nutrogan.site` como `app_url` por defecto en los mails del equipo.

## Contrato UI (sin cambios)

- `{ establecimiento_id, potrero_ids? }` → actualiza `ultimo_ndvi` / `fecha_ultimo_ndvi`
- `{ potrero_id }` → `{ historial: [{ date, ndvi }] }` para el gráfico

Respuesta bulk incluye `fuente: sentinel2-pc|agro`.
