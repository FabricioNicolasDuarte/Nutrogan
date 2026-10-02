import { supabase } from 'boot/supabase'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Guarda la lectura confirmada.
 * Condición → evaluaciones (sin inventar un peso).
 * Hallazgo serio o parásitos, si la persona lo deja marcado → eventos_sanitarios.
 * Siempre queda la fila en registros_vision, con la foto si se pudo subir.
 */
export async function guardarVisionConfirmada({ loteId, modo, fotoBlob, propuesta, userId }) {
  const fecha = hoy()
  let foto_path = null
  if (fotoBlob) {
    foto_path = `${loteId}/${crypto.randomUUID()}.jpg`
    const up = await supabase.storage.from('vision').upload(foto_path, fotoBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (up.error) throw up.error
  }

  let evaluacion_id = null
  let evento_sanitario_id = null

  if (modo === 'condicion') {
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert({
        lote_id: loteId,
        fecha_evaluacion: fecha,
        peso_promedio_kg: null,
        condicion_corporal: propuesta.condicion_corporal,
        observaciones: propuesta.nota || `Condición corporal ${propuesta.condicion_corporal}`,
      })
      .select('id')
      .single()
    if (error) throw error
    evaluacion_id = data.id
  }

  if (propuesta.registrar_evento && (modo === 'anomalia' || modo === 'fecal')) {
    const tipo = modo === 'fecal' ? 'Desparasitación' : 'Tratamiento'
    const descripcion =
      modo === 'fecal'
        ? `Lectura fecal: ${propuesta.consistencia}, ${propuesta.color}. ${propuesta.nota || ''}`.trim()
        : propuesta.descripcion || propuesta.nota
    const { data, error } = await supabase
      .from('eventos_sanitarios')
      .insert({
        lote_id: loteId,
        fecha,
        tipo_evento: tipo,
        descripcion,
      })
      .select('id')
      .single()
    if (error) throw error
    evento_sanitario_id = data.id
  }

  const { data, error } = await supabase
    .from('registros_vision')
    .insert({
      lote_id: loteId,
      modo,
      fecha,
      foto_path,
      texto_modelo: propuesta.texto_modelo || null,
      texto_confirmado: propuesta.nota || propuesta.descripcion || null,
      condicion_corporal: modo === 'condicion' ? propuesta.condicion_corporal : null,
      gravedad: modo === 'anomalia' ? propuesta.gravedad : null,
      consistencia: modo === 'fecal' ? propuesta.consistencia : null,
      color: modo === 'fecal' ? propuesta.color : null,
      presencia_parasitos: modo === 'fecal' ? !!propuesta.presencia_parasitos : null,
      evaluacion_id,
      evento_sanitario_id,
      created_by: userId || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
