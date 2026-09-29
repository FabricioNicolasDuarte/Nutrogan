import { describe, expect, it } from 'vitest'
import { evaluateOperationalAlerts, fieldPastureWarnings } from 'src/utils/operationalAlerts'

describe('evaluateOperationalAlerts', () => {
  it('alerta agua en peligro', () => {
    const alerts = evaluateOperationalAlerts({
      fuentesAgua: [{ id: 'a1', nombre: 'Tanque', activo: true, ultimo_estado: 'Peligro' }],
    })
    expect(alerts.some((a) => a.id === 'agua-peligro-a1' && a.severity === 'critical')).toBe(true)
  })

  it('alerta NDVI crítico solo con carga', () => {
    const sinCarga = evaluateOperationalAlerts({
      potreros: [{ id: 'p1', nombre: 'P1', activo: true, ultimo_ndvi: 0.2 }],
      lotes: [],
    })
    expect(sinCarga.some((a) => a.category === 'forraje')).toBe(false)

    const conCarga = evaluateOperationalAlerts({
      potreros: [{ id: 'p1', nombre: 'P1', activo: true, ultimo_ndvi: 0.2 }],
      lotes: [{ id: 'l1', activo: true, potrero_actual_id: 'p1', cantidad_animales: 40 }],
    })
    expect(conCarga.some((a) => a.id === 'ndvi-p1')).toBe(true)
  })

  it('alerta stock en 0 y mínimo', () => {
    const alerts = evaluateOperationalAlerts({
      inventarioItems: [
        { id: 'i1', nombre: 'Sal', activo: true, stock_actual: 0, unidad: 'kg' },
        {
          id: 'i2',
          nombre: 'Maíz',
          activo: true,
          stock_actual: 5,
          stock_minimo_alerta: 10,
          unidad: 'kg',
        },
      ],
    })
    expect(alerts.some((a) => a.id === 'stock-0-i1')).toBe(true)
    expect(alerts.some((a) => a.id === 'stock-min-i2' && a.severity === 'warn')).toBe(true)
  })

  it('alerta GDPV negativo con dos pesos', () => {
    const alerts = evaluateOperationalAlerts({
      lotes: [{ id: 'l1', identificacion: 'Lote A', activo: true }],
      evaluaciones: [
        { lote_id: 'l1', fecha_evaluacion: '2026-01-01', peso_promedio_kg: 400 },
        { lote_id: 'l1', fecha_evaluacion: '2026-01-31', peso_promedio_kg: 380 },
      ],
    })
    expect(alerts.some((a) => a.id === 'gdpv-l1' && a.severity === 'critical')).toBe(true)
  })

  it('alerta CC baja', () => {
    const alerts = evaluateOperationalAlerts({
      lotes: [{ id: 'l1', identificacion: 'Lote B', activo: true }],
      evaluaciones: [
        { lote_id: 'l1', fecha_evaluacion: '2026-03-01', condicion_corporal: 3 },
      ],
    })
    expect(alerts.some((a) => a.id === 'cc-l1')).toBe(true)
  })

  it('fieldPastureWarnings solo forraje', () => {
    const w = fieldPastureWarnings(
      [{ id: 'p1', nombre: 'P1', activo: true, ultimo_ndvi: 0.15 }],
      [{ id: 'l1', activo: true, potrero_actual_id: 'p1', cantidad_animales: 10 }],
    )
    expect(w.every((a) => a.category === 'forraje')).toBe(true)
    expect(w.length).toBeGreaterThan(0)
  })
})
