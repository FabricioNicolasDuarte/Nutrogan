import { describe, expect, it } from 'vitest'
import { decidirLote } from 'src/utils/decisionLote'

const hoy = new Date(2026, 9, 1)

function base(extra = {}) {
  return decidirLote({
    lote: {
      id: 'l1',
      identificacion: 'L1',
      cantidad_animales: 20,
      potrero_actual_id: 'p1',
      activo: true,
    },
    lotes: [
      {
        id: 'l1',
        cantidad_animales: 20,
        potrero_actual_id: 'p1',
        activo: true,
      },
    ],
    potrero: { id: 'p1', nombre: 'Norte', superficie_ha: 10, ultimo_ndvi: 0.6 },
    hoy,
    ...extra,
  })
}

describe('decidirLote', () => {
  it('no inventa kilos por día si falta un peso', () => {
    const d = base({
      evaluaciones: [{ lote_id: 'l1', fecha_evaluacion: '2026-09-01', peso_promedio_kg: 300 }],
    })
    const pesos = d.lineas.find((l) => l.id === 'pesos')
    expect(pesos.estado).toBe('falta')
    expect(pesos.lectura).not.toMatch(/kg por día/)
    expect(d.veredicto).toBe('faltan_datos')
  })

  it('pide revisar si el lote pierde kilos', () => {
    const d = base({
      evaluaciones: [
        { lote_id: 'l1', fecha_evaluacion: '2026-08-01', peso_promedio_kg: 320, condicion_corporal: 5 },
        { lote_id: 'l1', fecha_evaluacion: '2026-09-01', peso_promedio_kg: 300, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-20' }],
      registrosLluvia: [{ fecha: '2026-09-15', milimetros: 40 }],
      fuentesAgua: [
        {
          id: 'f1',
          potrero_id: 'p1',
          nombre: 'Tajamar',
          ultimo_estado: 'Óptimo',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false, gravedad: null }],
    })
    expect(d.lineas.find((l) => l.id === 'pesos').estado).toBe('atencion')
    expect(d.veredicto).toBe('revisar')
  })

  it('rota solo si hay días, vigor bajo y poca lluvia juntos', () => {
    const comun = {
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 280, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 310, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-08-01' }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
      potrero: { id: 'p1', superficie_ha: 10, ultimo_ndvi: 0.25 },
    }
    const sinLluvia = base(comun)
    expect(sinLluvia.lineas.find((l) => l.id === 'ocupacion').estado).toBe('falta')
    expect(sinLluvia.veredicto).not.toBe('rotar')

    const conLluvia = base({
      ...comun,
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 5 }],
    })
    expect(conLluvia.lineas.find((l) => l.id === 'ocupacion').estado).toBe('atencion')
    expect(conLluvia.lineas.find((l) => l.id === 'ocupacion').lectura).toMatch(/no dice cuántos kilos/)
    expect(conLluvia.veredicto).toBe('rotar')
    expect(conLluvia.lineas.find((l) => l.id === 'carga').lectura).toContain('2.00 cabezas/ha')
  })

  it('usa la lluvia de grilla solo si no hay milímetros cargados', () => {
    const comun = {
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 280, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 310, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-08-01' }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
      potrero: { id: 'p1', superficie_ha: 10, ultimo_ndvi: 0.25 },
      lluviaEstimadaMm: 8,
    }
    const estimada = base(comun)
    expect(estimada.lineas.find((l) => l.id === 'ocupacion').lectura).toMatch(/estimación de grilla/)
    expect(estimada.veredicto).toBe('rotar')

    const cargada = base({
      ...comun,
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
    })
    expect(cargada.lineas.find((l) => l.id === 'ocupacion').lectura).not.toMatch(/grilla/)
    expect(cargada.veredicto).not.toBe('rotar')
  })

  it('cuenta el cambio de vigor guardado sin convertirlo en pasto', () => {
    const d = base({
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 280, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 310, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-08-01' }],
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
      potrero: { id: 'p1', superficie_ha: 10, ultimo_ndvi: 0.41 },
      lecturasNdvi: [
        { potrero_id: 'p1', fecha: '2026-08-05', ndvi: 0.62 },
        { potrero_id: 'p1', fecha: '2026-09-20', ndvi: 0.41 },
      ],
    })
    const lectura = d.lineas.find((l) => l.id === 'ocupacion').lectura
    expect(lectura).toMatch(/bajó de 0\.62 a 0\.41/)
    expect(lectura).toMatch(/No son kilos de pasto/)
  })

  it('calcula el costo del kilo solo con uso, precio y kilos ganados', () => {
    const evaluaciones = [
      { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 300, condicion_corporal: 5 },
      { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 330, condicion_corporal: 5 },
    ]
    const cerrado = {
      evaluaciones,
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-25' }],
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'anomalia', fecha: '2026-09-01', gravedad: 'baja' }],
      inventarioMovimientos: [
        {
          tipo_movimiento: 'Uso',
          lote_id: 'l1',
          fecha: '2026-08-15',
          costo_total: 600000,
        },
      ],
    }
    const sinCotizacion = base(cerrado)
    const comida = sinCotizacion.lineas.find((l) => l.id === 'comida')
    expect(comida.estado).toBe('ok')
    expect(comida.hueco).toMatch(/cotización/)
    expect(sinCotizacion.veredicto).not.toBe('el_kilo_no_cierra')

    const caro = base({ ...cerrado, precioKg: 800 })
    expect(caro.lineas.find((l) => l.id === 'comida').estado).toBe('atencion')
    expect(caro.veredicto).toBe('el_kilo_no_cierra')
  })

  it('toma una situación solo si quien la cargó pidió revisión', () => {
    const cerrado = {
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 300, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 330, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-25' }],
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
    }
    const contexto = base({
      ...cerrado,
      situaciones: [
        {
          fecha: '2026-09-20',
          tipo: 'Mortandad',
          detalle: '2 cabezas',
          pedir_revision: false,
        },
      ],
    })
    expect(contexto.lineas.find((l) => l.id === 'situacion').estado).toBe('ok')
    expect(contexto.veredicto).not.toBe('revisar')

    const marcada = base({
      ...cerrado,
      situaciones: [
        {
          fecha: '2026-09-20',
          tipo: 'Mortandad',
          detalle: '2 cabezas',
          pedir_revision: true,
        },
      ],
    })
    expect(marcada.veredicto).toBe('revisar')
    expect(marcada.lineas.find((l) => l.id === 'situacion').lectura).toContain('Mortandad')

    const deOtro = base({
      ...cerrado,
      situaciones: [
        {
          lote_id: 'otro',
          fecha: '2026-09-20',
          tipo: 'Bicheras',
          detalle: 'En otro lote.',
          pedir_revision: true,
        },
      ],
    })
    expect(deOtro.lineas.find((l) => l.id === 'situacion').estado).toBe('ok')
    expect(deOtro.veredicto).not.toBe('revisar')
  })

  it('el agua en peligro manda a revisar y no diagnostica', () => {
    const d = base({
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 300, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 320, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-20' }],
      registrosLluvia: [{ fecha: '2026-09-01', milimetros: 30 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Pozo',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 4, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-02', presencia_parasitos: true }],
    })
    expect(d.veredicto).toBe('revisar')
    expect(d.lineas.find((l) => l.id === 'sanidad').lectura).not.toMatch(/diagnóstico automático|enfermedad confirmada/)
  })

  it('un tacto vacío o un aborto piden revisión y no inventan kilos', () => {
    const cerrado = {
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 300, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 330, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-25' }],
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
    }
    const servicio = base({
      ...cerrado,
      eventosReproductivos: [{ lote_id: 'l1', fecha: '2026-09-10', tipo_evento: 'Servicio' }],
    })
    expect(servicio.lineas.find((l) => l.id === 'reproduccion').estado).toBe('ok')
    expect(servicio.veredicto).not.toBe('revisar')
    expect(servicio.lineas.find((l) => l.id === 'pesos').lectura).toMatch(/Gana/)

    const vacia = base({
      ...cerrado,
      eventosReproductivos: [{ lote_id: 'l1', fecha: '2026-09-18', tipo_evento: 'Tacto (Vacía)' }],
    })
    expect(vacia.veredicto).toBe('revisar')
    expect(vacia.lineas.find((l) => l.id === 'reproduccion').lectura).toMatch(/vacío/)
    expect(vacia.lineas.find((l) => l.id === 'pesos').lectura).toMatch(/Gana/)
  })

  it('si sobró comida pide revisión y lo comido sigue siendo el uso', () => {
    const d = base({
      evaluaciones: [
        { fecha_evaluacion: '2026-08-01', peso_promedio_kg: 300, condicion_corporal: 5 },
        { fecha_evaluacion: '2026-09-01', peso_promedio_kg: 330, condicion_corporal: 5 },
      ],
      movimientos: [{ lote_id: 'l1', potrero_id: 'p1', fecha_entrada: '2026-09-25' }],
      registrosLluvia: [{ fecha: '2026-09-10', milimetros: 40 }],
      fuentesAgua: [
        {
          potrero_id: 'p1',
          nombre: 'Tajamar',
          analisis_de_agua: [{ fecha_analisis: '2026-09-01', ph: 7, solidos_totales: 400 }],
        },
      ],
      registrosVision: [{ modo: 'fecal', fecha: '2026-09-01', presencia_parasitos: false }],
      inventarioMovimientos: [
        {
          lote_id: 'l1',
          fecha: '2026-08-15',
          tipo_movimiento: 'Uso',
          cantidad: -8,
          costo_total: 2240,
          cantidad_puesta: 12,
          cantidad_sobrante: 4,
          inventario_items: { unidad: 'kg', precio_unitario: 280 },
        },
      ],
    })
    expect(d.lineas.find((l) => l.id === 'sobra').estado).toBe('atencion')
    expect(d.lineas.find((l) => l.id === 'sobra').lectura).toMatch(/sobraron 4/)
    expect(d.veredicto).toBe('revisar')
    expect(d.lineas.find((l) => l.id === 'comida').lectura).toMatch(/\$/)
  })
})
