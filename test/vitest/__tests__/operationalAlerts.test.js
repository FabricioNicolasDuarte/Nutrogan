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

  it('alerta la última lectura fecal con parásitos y la anomalía seria', () => {
    const alerts = evaluateOperationalAlerts({
      lotes: [{ id: 'l1', identificacion: 'Lote C', activo: true }],
      registrosVision: [
        {
          lote_id: 'l1',
          modo: 'fecal',
          fecha: '2026-04-02',
          presencia_parasitos: false,
          consistencia: 'Normal',
          color: 'Marrón',
        },
        {
          lote_id: 'l1',
          modo: 'fecal',
          fecha: '2026-04-01',
          presencia_parasitos: true,
          consistencia: 'Diarrea',
          color: 'Sanguinolento',
        },
        {
          lote_id: 'l1',
          modo: 'anomalia',
          fecha: '2026-04-03',
          gravedad: 'seria',
          texto_confirmado: 'Herida abierta',
        },
      ],
    })
    expect(alerts.some((a) => a.id === 'fecal-l1')).toBe(false)
    expect(alerts.some((a) => a.id === 'anomalia-l1')).toBe(true)

    const conParasitos = evaluateOperationalAlerts({
      lotes: [{ id: 'l1', identificacion: 'Lote C', activo: true }],
      registrosVision: [
        {
          lote_id: 'l1',
          modo: 'fecal',
          fecha: '2026-04-02',
          presencia_parasitos: true,
          consistencia: 'Diarrea',
          color: 'Sanguinolento',
        },
      ],
    })
    expect(conParasitos.some((a) => a.id === 'fecal-l1' && a.severity === 'critical')).toBe(true)
  })

  it('avisa rotar solo con días, vigor bajo y poca lluvia', () => {
    const alerts = evaluateOperationalAlerts({
      lotes: [
        {
          id: 'l1',
          identificacion: 'L1',
          activo: true,
          potrero_actual_id: 'p1',
          cantidad_animales: 10,
        },
      ],
      potreros: [{ id: 'p1', nombre: 'Norte', activo: true, ultimo_ndvi: 0.25, superficie_ha: 10 }],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-08-01' }],
      registrosLluvia: [{
        fecha: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        milimetros: 4,
      }],
      evaluaciones: [
        { lote_id: 'l1', fecha_evaluacion: '2026-08-01', peso_promedio_kg: 200, condicion_corporal: 5 },
        { lote_id: 'l1', fecha_evaluacion: '2026-09-01', peso_promedio_kg: 220, condicion_corporal: 5 },
      ],
    })
    expect(alerts.some((a) => a.id === 'rotar-l1')).toBe(true)
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
