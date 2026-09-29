# Aptitud de producto — Nutrogan

**Fecha:** 2026-09-29  
**Veredicto:** **Apta con reservas** (mejorada tras correcciones P0 de honestidad).

## Para qué sirve

Gestión ganadera offline-first: potreros, lotes, pesos → GDPV, condición corporal INTA 1–9, agua, inventario, NDVI de pastura, alertas al equipo, modo campo.

## Qué ya es correcto / estándar

| Área | Estado |
|------|--------|
| GDPV (ADG) | Fórmula (P₂−P₁)/días; no inventa si faltan pesos |
| CC INTA 1–9 | Escala argentina manual; sin IA fingida |
| EN PASTO | % cabezas con potrero real |
| NDVI | Sentinel-2 L2A vía Planetary Computer (real) |
| Roles / campo | Operario → field; admin/técnico satélite/reportes |
| Offline | Cola IndexedDB + sync |

## Hallazgos y acciones (esta ola)

| ID | Sev. | Problema | Acción hecha |
|----|------|----------|--------------|
| H1 | P0 | Sensor IoT / satélite de agua con `Math.random` | **Eliminado** — solo análisis cargados |
| H2 | P0 | Precio LIVE inventado (random) | **Sin inventar**; badge MAG / SIN DATO / MANUAL |
| H3 | P0 | UI vendía NDMI sin dato | **Oculto**; copy NDVI honesto |
| H4 | P1 | Umbrales agua desalineados | Recalibrados ganado + As; hints alineados |
| H5 | P1 | IA sin disclaimer | System prompt + banner UI |

## Reservas que siguen

1. Scraping MAG toma el primer `$` razonable — puede no ser la categoría correcta (novillo/vaca). Verificar o fijar **manual con categoría** en el widget.
2. Bandas NDVI EXCELENTE/BUENO son heurística, no biomasa kg MS.
3. Alertas operativas se **evalúan en cliente** (CC/GDPV/agua/stock/NDVI+carga) y se pueden **avisar al equipo** (email) desde Reportes/Dashboard; no hay cron server-side.
4. `send-alert` usa `RESEND_FROM` si está configurado; si no, sandbox `onboarding@resend.dev`.
5. Umbrales de agua son **orientativos de campo**, no norma ISO única; laboratorio manda.

## Cierre de loop (2026-09-29)

| Pieza | Estado |
|-------|--------|
| Motor `operationalAlerts` | CC, GDPV, agua, stock, NDVI con carga |
| UI + mail | Panel en Reportes; badge en Dashboard; categorías agua/forraje en equipo |
| Campo | Botón AGUA (pH+TDS offline); banner pastura baja |
| Precio | MAG / SIN DATO / MANUAL + categoría |
| Sync campo | SINCRONIZADO + última OK + cola `analisis_agua` |

## Cómo validar en campo

```bash
npm run test:unit:run
npm run test:smoke
npm run test:smoke:write
```

Redeploy edges tras este commit:

```bash
npx supabase functions deploy get-market-price --project-ref cglogstrtjvbpsoaghib
npx supabase functions deploy asistente-ia --project-ref cglogstrtjvbpsoaghib
```
