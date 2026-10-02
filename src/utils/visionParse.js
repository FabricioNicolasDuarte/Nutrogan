const CONSISTENCIAS = ['Normal', 'Blanda', 'Dura', 'Diarrea']
const COLORES = ['Marrón', 'Verde', 'Pálido', 'Sanguinolento']

export function extractJson(text) {
  const raw = String(text || '').trim()
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

function notaDe(json) {
  return String(json.nota || json.descripcion || '').trim().slice(0, 500)
}

/**
 * La foto propone. Si el número no se puede leer, queda vacío: no se inventa un 5.
 */
export function parseVisionProposal(modo, text) {
  const json = extractJson(text) || {}
  const nota = notaDe(json)
  const texto_modelo = String(text || '').slice(0, 2000)

  if (modo === 'condicion') {
    const n = Number(String(json.condicion_corporal ?? '').replace(',', '.'))
    const stepped = Number.isFinite(n) ? Math.round(n * 2) / 2 : null
    const condicion_corporal = stepped != null && stepped >= 1 && stepped <= 9 ? stepped : null
    return {
      condicion_corporal,
      nota,
      texto_modelo,
      gravedad: null,
      descripcion: '',
      consistencia: null,
      color: null,
      presencia_parasitos: false,
      registrar_evento: false,
    }
  }

  if (modo === 'anomalia') {
    const gravedad = String(json.gravedad || '').toLowerCase() === 'seria' ? 'seria' : 'baja'
    const descripcion = String(json.descripcion || nota || '').trim().slice(0, 500)
    return {
      condicion_corporal: null,
      nota: nota || descripcion,
      texto_modelo,
      gravedad,
      descripcion,
      consistencia: null,
      color: null,
      presencia_parasitos: false,
      registrar_evento: gravedad === 'seria',
    }
  }

  const consistencia = CONSISTENCIAS.includes(json.consistencia) ? json.consistencia : 'Normal'
  const color = COLORES.includes(json.color) ? json.color : 'Marrón'
  const presencia_parasitos = json.presencia_parasitos === true
  return {
    condicion_corporal: null,
    nota,
    texto_modelo,
    gravedad: null,
    descripcion: '',
    consistencia,
    color,
    presencia_parasitos,
    registrar_evento: presencia_parasitos,
  }
}
