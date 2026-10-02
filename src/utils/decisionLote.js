/**
 * Decisión de un lote a partir de datos ya cargados.
 * Si falta un dato, el renglón queda vacío. No convierte NDVI en kilos de pasto
 * ni diagnostica.
 */

import { evaluacionesConPeso, calcGdpv } from './gdpv.js'
import { calcularCalidadAgua } from './waterQuality.js'

const CC_BAJA = 3.5

export const DECISION_HEURISTICA = {
  ocupacionLargaDias: 21,
  lluviaPocaMm: 20,
  lluviaVentanaDias: 30,
  ndviParaRotar: 0.4,
  situacionDias: 60,
}

export const AMBITOS_SITUACION = [
  { id: 'sanidad', label: 'Sanidad' },
  { id: 'potrero', label: 'Potrero' },
  { id: 'comida', label: 'Comida' },
  { id: 'hacienda', label: 'Hacienda' },
  { id: 'agua', label: 'Agua' },
  { id: 'otro', label: 'Otro' },
]

function diaUtc(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const s = String(value || '').slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

function diasEntre(desde, hasta) {
  if (desde == null || hasta == null) return null
  return Math.round((hasta - desde) / 86400000)
}

function dinero(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function linea(partial) {
  return {
    oficio: partial.oficio,
    id: partial.id,
    titulo: partial.titulo,
    lectura: partial.lectura,
    hueco: partial.hueco || null,
    estado: partial.estado,
  }
}

function cargaDelPotrero(lotes, potrero) {
  if (!potrero?.id) return { cabezas: null, ha: null, carga: null }
  const ha = Number(potrero.superficie_ha)
  const cabezas = (lotes || [])
    .filter((l) => l.activo !== false && l.potrero_actual_id === potrero.id)
    .reduce((acc, l) => acc + (Number(l.cantidad_animales) || 0), 0)
  const haOk = Number.isFinite(ha) && ha > 0
  const cabezasOk = cabezas > 0
  return {
    cabezas: cabezasOk ? cabezas : null,
    ha: haOk ? ha : null,
    carga: haOk && cabezasOk ? cabezas / ha : null,
  }
}

function diasOcupacion(movimientos, loteId, potreroId, hoy) {
  if (!potreroId) return null
  const abiertos = (movimientos || [])
    .filter((m) => m.lote_id === loteId && m.potrero_id === potreroId && !m.fecha_salida)
    .sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)))
  const entrada = diaUtc(abiertos[0]?.fecha_entrada)
  const fin = diaUtc(hoy)
  const dias = diasEntre(entrada, fin)
  if (dias == null || dias < 0) return null
  return dias
}

function mmEnVentana(registros, hoy, dias) {
  const fin = diaUtc(hoy)
  if (fin == null) return null
  const desde = fin - dias * 86400000
  let suma = 0
  let n = 0
  for (const row of registros || []) {
    const t = diaUtc(row.fecha)
    const mm = Number(row.milimetros)
    if (t == null || !Number.isFinite(mm)) continue
    if (t >= desde && t <= fin) {
      suma += mm
      n += 1
    }
  }
  if (!n) return null
  return suma
}

function costoUsos(movimientosInventario, loteId, desde, hasta) {
  let total = 0
  let n = 0
  for (const mov of movimientosInventario || []) {
    if (String(mov.tipo_movimiento || '').toLowerCase() !== 'uso') continue
    if ((mov.lote_id || mov.p_lote_id) !== loteId) continue
    const t = diaUtc(mov.fecha)
    if (t == null || t < desde || t > hasta) continue
    let val = Number(mov.costo_total)
    if (!Number.isFinite(val) || val === 0) {
      const qty = Math.abs(Number(mov.cantidad))
      const precio = Number(mov.inventario_items?.precio_unitario)
      if (qty > 0 && precio > 0) val = qty * precio
    }
    if (Number.isFinite(val) && val !== 0) {
      total += Math.abs(val)
      n += 1
    }
  }
  if (!n) return null
  return total
}

function cambioVigor(lecturas, potreroId, entradaDia, hoyDia) {
  if (entradaDia == null || hoyDia == null) return null
  const rows = (lecturas || [])
    .filter((r) => r.potrero_id === potreroId && Number.isFinite(Number(r.ndvi)))
    .map((r) => ({ t: diaUtc(r.fecha), ndvi: Number(r.ndvi) }))
    .filter((r) => r.t != null)
    .sort((a, b) => a.t - b.t)
  if (rows.length < 2) return null
  const durante = rows.filter((r) => r.t >= entradaDia && r.t <= hoyDia)
  const antes = rows.filter((r) => r.t < entradaDia).at(-1)
  const primero = antes || durante[0]
  const ultimo = durante.at(-1)
  if (!primero || !ultimo || primero.t === ultimo.t) return null
  if (ultimo.t - primero.t < 7 * 86400000) return null
  return { desde: primero.ndvi, hasta: ultimo.ndvi }
}

function textoCambioVigor(cambio) {
  if (!cambio) return ''
  const verbo = cambio.hasta + 0.05 < cambio.desde ? 'bajó' : 'pasó'
  return ` El vigor ${verbo} de ${cambio.desde.toFixed(2)} a ${cambio.hasta.toFixed(2)} con el lote adentro. No son kilos de pasto.`
}

function aguaDelPotrero(fuentes, potreroId) {
  if (!potreroId) return { estado: 'sin_potrero', detalle: null }
  const propias = (fuentes || []).filter(
    (f) => f.activo !== false && f.potrero_id === potreroId,
  )
  if (!propias.length) return { estado: 'sin_fuente', detalle: null }
  const fuente = propias[0]
  const analisis = [...(fuente.analisis_de_agua || [])].sort((a, b) =>
    String(b.fecha_analisis || '').localeCompare(String(a.fecha_analisis || '')),
  )[0]
  if (analisis) {
    const calidad = calcularCalidadAgua(analisis)
    return { estado: calidad.estado, detalle: fuente.nombre, peligros: calidad.peligros }
  }
  if (fuente.ultimo_estado) {
    return { estado: fuente.ultimo_estado, detalle: fuente.nombre, peligros: [] }
  }
  return { estado: 'sin_analisis', detalle: fuente.nombre, peligros: [] }
}

function dentroDeDias(fecha, hoy, dias) {
  const fin = diaUtc(hoy)
  const t = diaUtc(fecha)
  if (fin == null || t == null) return false
  const desde = fin - dias * 86400000
  return t >= desde && t <= fin
}

function esTactoVacio(ev) {
  const tipo = String(ev?.tipo_evento || '').toLowerCase()
  if (!tipo.includes('tacto')) return false
  const texto = `${ev.tipo_evento || ''} ${ev.descripcion || ''}`.toLowerCase()
  return texto.includes('vacía') || texto.includes('vacia')
}

function lecturaReproduccion(eventos, loteId, hoy) {
  const rows = (eventos || [])
    .filter((e) => !loteId || !e.lote_id || e.lote_id === loteId)
    .filter((e) => dentroDeDias(e.fecha, hoy, DECISION_HEURISTICA.situacionDias))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
  const aborto = rows.find((e) => String(e.tipo_evento || '').toLowerCase().includes('aborto'))
  const tactos = rows.filter((e) => String(e.tipo_evento || '').toLowerCase().includes('tacto'))
  const tactoVacio = tactos.find(esTactoVacio)
  if (aborto || tactoVacio) {
    const partes = []
    if (tactoVacio) partes.push('el último tacto figura vacío')
    if (aborto) partes.push('hay un aborto cargado')
    const aviso = partes.join(' y ')
    return linea({
      id: 'reproduccion',
      oficio: 'Zootecnia',
      titulo: 'Servicio y tacto',
      lectura: `${aviso.charAt(0).toUpperCase()}${aviso.slice(1)}. Conviene revisarlo antes de seguir igual. No suma kilos ni entra en el costo.`,
      estado: 'atencion',
    })
  }
  if (rows.length) {
    return linea({
      id: 'reproduccion',
      oficio: 'Zootecnia',
      titulo: 'Servicio y tacto',
      lectura: `El último evento es ${rows[0].tipo_evento}. Queda en la historia y no cambia los kilos ni el costo.`,
      estado: 'ok',
    })
  }
  return linea({
    id: 'reproduccion',
    oficio: 'Zootecnia',
    titulo: 'Servicio y tacto',
    lectura: 'No hay un tacto vacío ni un aborto reciente. El servicio y el parto no cambian la decisión.',
    estado: 'ok',
  })
}

function lecturaSobra(movimientos, loteId, hoy) {
  const anotadas = (movimientos || [])
    .filter((m) => String(m.tipo_movimiento || '').toLowerCase() === 'uso')
    .filter((m) => !loteId || m.lote_id === loteId)
    .filter((m) => m.cantidad_puesta != null || m.cantidad_sobrante != null)
    .filter((m) => dentroDeDias(m.fecha, hoy, DECISION_HEURISTICA.situacionDias))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
  const ultima = anotadas[0]
  if (!ultima) {
    return linea({
      id: 'sobra',
      oficio: 'Zootecnia',
      titulo: 'Comida aceptada',
      lectura: 'Al dar de comer se puede anotar cuánto se puso y cuánto sobró. Sin eso no se sabe si la aceptaron.',
      estado: 'ok',
    })
  }
  const puesta = Number(ultima.cantidad_puesta)
  const sobrante = Number(ultima.cantidad_sobrante)
  const unidad = ultima.inventario_items?.unidad ? ` ${ultima.inventario_items.unidad}` : ''
  if (Number.isFinite(sobrante) && sobrante > 0) {
    const puestoTxt = Number.isFinite(puesta) ? `${puesta}${unidad}` : 'una ración'
    return linea({
      id: 'sobra',
      oficio: 'Zootecnia',
      titulo: 'Comida aceptada',
      lectura: `La última vez se pusieron ${puestoTxt} y sobraron ${sobrante}${unidad}. Conviene ver por qué no se terminó.`,
      estado: 'atencion',
    })
  }
  return linea({
    id: 'sobra',
    oficio: 'Zootecnia',
    titulo: 'Comida aceptada',
    lectura: Number.isFinite(puesta)
      ? `La última comida se terminó. Se pusieron ${puesta}${unidad}.`
      : 'La última comida anotada no dejó sobrante.',
    estado: 'ok',
  })
}

/**
 * @returns {{
 *   veredicto: 'seguir'|'rotar'|'revisar'|'el_kilo_no_cierra'|'faltan_datos',
 *   titulo: string,
 *   lineas: Array<{id:string,oficio:string,titulo:string,lectura:string,hueco:string|null,estado:'ok'|'atencion'|'falta'}>
 * }}
 */
export function decidirLote({
  lote,
  lotes = [],
  potrero = null,
  evaluaciones = [],
  movimientos = [],
  registrosLluvia = [],
  fuentesAgua = [],
  registrosVision = [],
  inventarioMovimientos = [],
  situaciones = [],
  lecturasNdvi = [],
  lluviaEstimadaMm = null,
  precioKg = null,
  eventosReproductivos = [],
  hoy = new Date(),
} = {}) {
  const lineas = []
  const evs = evaluacionesConPeso(evaluaciones)
  const gdpv = calcGdpv(evaluaciones)

  if (gdpv === null) {
    lineas.push(
      linea({
        id: 'pesos',
        oficio: 'Zootecnia',
        titulo: 'Kilos por día',
        lectura: 'Sin dos pesadas no se sabe si el lote gana o pierde.',
        hueco: 'Falta una segunda pesada con fecha.',
        estado: 'falta',
      }),
    )
  } else if (gdpv < 0) {
    lineas.push(
      linea({
        id: 'pesos',
        oficio: 'Zootecnia',
        titulo: 'Kilos por día',
        lectura: `Pierde ${Math.abs(gdpv).toFixed(3)} kg por día. No conviene seguir igual.`,
        estado: 'atencion',
      }),
    )
  } else {
    lineas.push(
      linea({
        id: 'pesos',
        oficio: 'Zootecnia',
        titulo: 'Kilos por día',
        lectura: `Gana ${gdpv.toFixed(3)} kg por día entre las pesadas cargadas.`,
        estado: 'ok',
      }),
    )
  }

  const conCc = [...(evaluaciones || [])]
    .filter((e) => Number.isFinite(Number(e.condicion_corporal)) && e.fecha_evaluacion)
    .sort((a, b) => String(b.fecha_evaluacion).localeCompare(String(a.fecha_evaluacion)))
  if (!conCc[0]) {
    lineas.push(
      linea({
        id: 'condicion',
        oficio: 'Zootecnia',
        titulo: 'Condición corporal',
        lectura: 'Sin una condición confirmada no se puede explicar una baja.',
        hueco: 'Falta una condición de 1 a 9 confirmada por una persona.',
        estado: 'falta',
      }),
    )
  } else {
    const cc = Number(conCc[0].condicion_corporal)
    lineas.push(
      linea({
        id: 'condicion',
        oficio: 'Zootecnia',
        titulo: 'Condición corporal',
        lectura:
          cc <= CC_BAJA
            ? `La última condición es ${cc}. Está baja: conviene bajar la exigencia o revisar comida y sanidad.`
            : `La última condición es ${cc}.`,
        estado: cc <= CC_BAJA ? 'atencion' : 'ok',
      }),
    )
  }

  const carga = cargaDelPotrero(lotes.length ? lotes : lote ? [lote] : [], potrero)
  if (!potrero) {
    lineas.push(
      linea({
        id: 'carga',
        oficio: 'Zootecnia',
        titulo: 'Cabezas por hectárea',
        lectura: 'El lote no está en un potrero, así que no hay carga.',
        hueco: 'Falta asignar el potrero.',
        estado: 'falta',
      }),
    )
  } else if (carga.carga == null) {
    lineas.push(
      linea({
        id: 'carga',
        oficio: 'Zootecnia',
        titulo: 'Cabezas por hectárea',
        lectura: 'Falta la superficie del dibujo o las cabezas del potrero.',
        hueco: 'Sin hectáreas o sin cabezas no se calcula la carga. No se pasa a equivalente vaca.',
        estado: 'falta',
      }),
    )
  } else {
    lineas.push(
      linea({
        id: 'carga',
        oficio: 'Zootecnia',
        titulo: 'Cabezas por hectárea',
        lectura: `${carga.carga.toFixed(2)} cabezas/ha (${carga.cabezas} cabezas en ${carga.ha.toFixed(2)} ha).`,
        estado: 'ok',
      }),
    )
  }

  const dias = diasOcupacion(movimientos, lote?.id, potrero?.id, hoy)
  const lecturasDelPotrero = (lecturasNdvi || []).filter((r) => r.potrero_id === potrero?.id)
  const ultimaLectura = [...lecturasDelPotrero].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha)),
  )[0]
  const ndviPotrero = Number(potrero?.ultimo_ndvi)
  const ndvi = Number.isFinite(ndviPotrero)
    ? ndviPotrero
    : Number.isFinite(Number(ultimaLectura?.ndvi))
      ? Number(ultimaLectura.ndvi)
      : NaN
  const ndviOk = Number.isFinite(ndvi)
  const mmManual = mmEnVentana(registrosLluvia, hoy, DECISION_HEURISTICA.lluviaVentanaDias)
  const estimada =
    lluviaEstimadaMm == null || lluviaEstimadaMm === '' ? null : Number(lluviaEstimadaMm)
  const usaEstimada = mmManual == null && Number.isFinite(estimada)
  const mm = usaEstimada ? estimada : mmManual
  const notaLluvia = usaEstimada ? ' Es una estimación de grilla, no el pluviómetro del campo.' : ''
  const cambio = cambioVigor(lecturasNdvi, potrero?.id, dias == null ? null : diaUtc(hoy) - dias * 86400000, diaUtc(hoy))
  const notaVigor = textoCambioVigor(cambio)
  const faltanOcupacion = []
  if (dias == null) faltanOcupacion.push('los días de entrada al potrero')
  if (!ndviOk) faltanOcupacion.push('el vigor satelital')
  if (mm == null) faltanOcupacion.push('los milímetros de los últimos 30 días')

  if (!potrero) {
    lineas.push(
      linea({
        id: 'ocupacion',
        oficio: 'Agronomía',
        titulo: 'Rotación',
        lectura: 'Sin potrero no se puede decir si conviene rotar.',
        hueco: 'Falta el potrero, el vigor y la lluvia cargada.',
        estado: 'falta',
      }),
    )
  } else if (faltanOcupacion.length) {
    lineas.push(
      linea({
        id: 'ocupacion',
        oficio: 'Agronomía',
        titulo: 'Rotación',
        lectura: 'Para rotar hacen falta los tres datos juntos.',
        hueco: `Falta ${faltanOcupacion.join(', ')}. El satélite no se convierte en kilos de pasto.`,
        estado: 'falta',
      }),
    )
  } else {
    const rotar =
      dias >= DECISION_HEURISTICA.ocupacionLargaDias &&
      ndvi < DECISION_HEURISTICA.ndviParaRotar &&
      mm < DECISION_HEURISTICA.lluviaPocaMm
    lineas.push(
      linea({
        id: 'ocupacion',
        oficio: 'Agronomía',
        titulo: 'Rotación',
        lectura: rotar
          ? `Conviene rotar o aliviar: lleva ${dias} días, el vigor es ${ndvi.toFixed(2)} y en 30 días llovieron ${mm.toFixed(0)} mm.${notaLluvia}${notaVigor} Eso no dice cuántos kilos de pasto quedan.`
          : `Lleva ${dias} días, vigor ${ndvi.toFixed(2)} y ${mm.toFixed(0)} mm en 30 días.${notaLluvia}${notaVigor} Todavía no se juntan los tres avisos para rotar.`,
        estado: rotar ? 'atencion' : 'ok',
      }),
    )
  }

  const agua = aguaDelPotrero(fuentesAgua, potrero?.id)
  if (agua.estado === 'sin_potrero' || agua.estado === 'sin_fuente') {
    lineas.push(
      linea({
        id: 'agua',
        oficio: 'Veterinaria',
        titulo: 'Agua de bebida',
        lectura: 'No hay una aguada de este potrero para leer.',
        hueco: 'Falta el análisis cargado de la aguada. No hay un sensor en vivo.',
        estado: 'falta',
      }),
    )
  } else if (agua.estado === 'sin_analisis') {
    lineas.push(
      linea({
        id: 'agua',
        oficio: 'Veterinaria',
        titulo: 'Agua de bebida',
        lectura: `${agua.detalle} no tiene un análisis cargado.`,
        hueco: 'Sin el análisis no se sabe si el agua frena la ganancia.',
        estado: 'falta',
      }),
    )
  } else if (agua.estado === 'Peligro' || agua.estado === 'Precaución') {
    lineas.push(
      linea({
        id: 'agua',
        oficio: 'Veterinaria',
        titulo: 'Agua de bebida',
        lectura: `${agua.detalle} está en ${agua.estado.toLowerCase()}. Esa aguada puede frenar la ganancia antes que la comida. El laboratorio sigue mandando.`,
        estado: 'atencion',
      }),
    )
  } else {
    lineas.push(
      linea({
        id: 'agua',
        oficio: 'Veterinaria',
        titulo: 'Agua de bebida',
        lectura: `${agua.detalle}: el último análisis cargado no marca riesgo.`,
        estado: 'ok',
      }),
    )
  }

  const vision = [...(registrosVision || [])].sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha)),
  )
  const fecal = vision.find((r) => r.modo === 'fecal')
  const anomalia = vision.find((r) => r.modo === 'anomalia')
  if (!fecal && !anomalia) {
    lineas.push(
      linea({
        id: 'sanidad',
        oficio: 'Veterinaria',
        titulo: 'Sanidad vista',
        lectura: 'No hay una lectura fecal ni de anomalía confirmada.',
        hueco: 'Sin esa lectura no se revisa sanidad desde la foto. No es un diagnóstico.',
        estado: 'falta',
      }),
    )
  } else if (fecal?.presencia_parasitos || anomalia?.gravedad === 'seria') {
    const partes = []
    if (fecal?.presencia_parasitos) partes.push('la última lectura fecal marca signos de parásitos')
    if (anomalia?.gravedad === 'seria') partes.push('hay una anomalía seria')
    const avisoSanidad = partes.join(' y ')
    lineas.push(
      linea({
        id: 'sanidad',
        oficio: 'Veterinaria',
        titulo: 'Sanidad vista',
        lectura: `${avisoSanidad.charAt(0).toUpperCase()}${avisoSanidad.slice(1)}. Conviene revisarlo con el veterinario antes de seguir engordando.`,
        estado: 'atencion',
      }),
    )
  } else {
    lineas.push(
      linea({
        id: 'sanidad',
        oficio: 'Veterinaria',
        titulo: 'Sanidad vista',
        lectura: 'La última lectura confirmada no marca parásitos ni algo serio.',
        estado: 'ok',
      }),
    )
  }

  const precio = Number(precioKg)
  const hayPrecio = Number.isFinite(precio) && precio > 0
  const cabezas = Number(lote?.cantidad_animales) || 0
  if (evs.length < 2 || gdpv === null) {
    lineas.push(
      linea({
        id: 'comida',
        oficio: 'Zootecnia',
        titulo: 'Costo del kilo',
        lectura: 'Sin dos pesadas no hay kilos ganados para repartir la comida.',
        hueco: 'Falta el período entre dos pesos.',
        estado: 'falta',
      }),
    )
  } else {
    const p1 = parseFloat(evs[0].peso_promedio_kg)
    const p2 = parseFloat(evs[evs.length - 1].peso_promedio_kg)
    const delta = p2 - p1
    const desde = diaUtc(evs[0].fecha_evaluacion)
    const hasta = diaUtc(evs[evs.length - 1].fecha_evaluacion)
    const costo = costoUsos(inventarioMovimientos, lote?.id, desde, hasta)
    if (!(delta > 0) || !(cabezas > 0)) {
      lineas.push(
        linea({
          id: 'comida',
          oficio: 'Zootecnia',
          titulo: 'Costo del kilo',
          lectura: 'En el período de las pesadas el lote no sumó kilos. No hay un costo por kilo ganado.',
          estado: 'ok',
        }),
      )
    } else if (costo == null) {
      lineas.push(
        linea({
          id: 'comida',
          oficio: 'Zootecnia',
          titulo: 'Costo del kilo',
          lectura: 'Hay kilos ganados, pero no hay comida usada asignada a este lote en ese período.',
          hueco: 'Falta un uso de la despensa con precio, asignado al lote.',
          estado: 'falta',
        }),
      )
    } else {
      const kg = delta * cabezas
      const porKilo = costo / kg
      if (!hayPrecio) {
        lineas.push(
          linea({
            id: 'comida',
            oficio: 'Zootecnia',
            titulo: 'Costo del kilo',
            lectura: `La comida de cada kilo ganado costó ${dinero(porKilo)}.`,
            hueco: 'Falta la cotización para saber si conviene terminarlo en el campo.',
            estado: 'ok',
          }),
        )
      } else if (porKilo > precio) {
        lineas.push(
          linea({
            id: 'comida',
            oficio: 'Zootecnia',
            titulo: 'Costo del kilo',
            lectura: `La comida de cada kilo ganado costó ${dinero(porKilo)} y la cotización es ${dinero(precio)}. El kilo no cierra.`,
            estado: 'atencion',
          }),
        )
      } else {
        lineas.push(
          linea({
            id: 'comida',
            oficio: 'Zootecnia',
            titulo: 'Costo del kilo',
            lectura: `La comida de cada kilo ganado costó ${dinero(porKilo)}, por debajo de la cotización ${dinero(precio)}.`,
            estado: 'ok',
          }),
        )
      }
    }
  }

  const repro = lecturaReproduccion(eventosReproductivos, lote?.id, hoy)
  lineas.push(repro)

  const sobra = lecturaSobra(inventarioMovimientos, lote?.id, hoy)
  lineas.push(sobra)

  const finSit = diaUtc(hoy)
  const desdeSit = finSit == null ? null : finSit - DECISION_HEURISTICA.situacionDias * 86400000
  const recientes = (situaciones || [])
    .filter((s) => {
      if (s.lote_id && lote?.id && s.lote_id !== lote.id) return false
      const t = diaUtc(s.fecha)
      return t != null && desdeSit != null && t >= desdeSit && t <= finSit && String(s.tipo || '').trim()
    })
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
  const piden = recientes.filter((s) => s.pedir_revision)
  if (piden.length) {
    const texto = piden
      .slice(0, 3)
      .map((s) => {
        const detalle = String(s.detalle || '').trim().replace(/\.$/, '')
        return `${String(s.tipo).trim()}${detalle ? `: ${detalle}` : ''}`
      })
      .join('. ')
    lineas.push(
      linea({
        id: 'situacion',
        oficio: 'Campo',
        titulo: 'Situación cargada',
        lectura: `Pediste tener en cuenta: ${texto}.`,
        estado: 'atencion',
      }),
    )
  } else if (recientes.length) {
    lineas.push(
      linea({
        id: 'situacion',
        oficio: 'Campo',
        titulo: 'Situación cargada',
        lectura: `La última situación es «${recientes[0].tipo}». No pide cambiar el manejo.`,
        estado: 'ok',
      }),
    )
  } else {
    lineas.push(
      linea({
        id: 'situacion',
        oficio: 'Campo',
        titulo: 'Situación cargada',
        lectura: 'No hay una situación extra. Si pasa algo que los otros renglones no cubren, se anota acá.',
        estado: 'ok',
      }),
    )
  }

  const revisar = lineas.some(
    (l) =>
      l.estado === 'atencion' &&
      (l.id === 'pesos' ||
        l.id === 'condicion' ||
        l.id === 'agua' ||
        l.id === 'sanidad' ||
        l.id === 'situacion' ||
        l.id === 'reproduccion' ||
        l.id === 'sobra'),
  )
  const rotar = lineas.some((l) => l.id === 'ocupacion' && l.estado === 'atencion')
  const noCierra = lineas.some((l) => l.id === 'comida' && l.estado === 'atencion')
  const faltan = lineas.filter((l) => l.estado === 'falta').length

  let veredicto = 'seguir'
  let titulo = 'Con lo cargado, no hay un aviso para cambiar el manejo.'
  if (revisar) {
    veredicto = 'revisar'
    titulo = 'Revisá el aviso marcado antes de seguir igual.'
  } else if (rotar) {
    veredicto = 'rotar'
    titulo = 'Conviene rotar o aliviar este potrero.'
  } else if (noCierra) {
    veredicto = 'el_kilo_no_cierra'
    titulo = 'La comida de cada kilo ganado sale más cara que la cotización.'
  } else if (faltan >= 4) {
    veredicto = 'faltan_datos'
    titulo = 'Faltan datos para decidir. Cada renglón dice cuál.'
  }

  return { veredicto, titulo, lineas }
}

export function decisionDesdeContexto(lote, ctx = {}) {
  const potrero =
    (ctx.potreros || []).find((p) => p.id === lote?.potrero_actual_id) || ctx.potrero || null
  return decidirLote({
    lote,
    lotes: ctx.lotes || [],
    potrero,
    evaluaciones: (ctx.evaluaciones || []).filter((e) => e.lote_id === lote?.id),
    movimientos: (ctx.movimientos || []).filter((m) => m.lote_id === lote?.id),
    registrosLluvia: ctx.registrosLluvia || [],
    fuentesAgua: ctx.fuentesAgua || [],
    registrosVision: (ctx.registrosVision || []).filter((r) => r.lote_id === lote?.id),
    inventarioMovimientos: ctx.inventarioMovimientos || [],
    eventosReproductivos: (ctx.eventosReproductivos || []).filter((e) => e.lote_id === lote?.id),
    situaciones: (ctx.situaciones || []).filter((s) => s.lote_id === lote?.id),
    lecturasNdvi: ctx.lecturasNdvi || [],
    lluviaEstimadaMm: ctx.lluviaEstimada?.[potrero?.id] ?? ctx.lluviaEstimadaMm ?? null,
    precioKg: ctx.precioKg,
    hoy: ctx.hoy,
  })
}
