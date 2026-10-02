import { describe, expect, it } from 'vitest'
import { parseVisionProposal } from 'src/utils/visionParse'

describe('parseVisionProposal', () => {
  it('lee la condición y no inventa un número si la foto no alcanza', () => {
    const ok = parseVisionProposal('condicion', '{"condicion_corporal": 4.5, "nota": "costillas visibles"}')
    expect(ok.condicion_corporal).toBe(4.5)

    const vacio = parseVisionProposal(
      'condicion',
      '{"condicion_corporal": null, "nota": "No se distingue un animal"}',
    )
    expect(vacio.condicion_corporal).toBeNull()
  })

  it('marca evento solo si la anomalía es seria', () => {
    const baja = parseVisionProposal('anomalia', '{"descripcion": "alambrado flojo", "gravedad": "baja", "nota": "revisar"}')
    expect(baja.registrar_evento).toBe(false)
    const seria = parseVisionProposal('anomalia', '{"descripcion": "herida abierta", "gravedad": "seria", "nota": "ver"}')
    expect(seria.registrar_evento).toBe(true)
    expect(seria.gravedad).toBe('seria')
  })

  it('propone evento sanitario si la lectura fecal marca parásitos', () => {
    const limpio = parseVisionProposal(
      'fecal',
      '{"consistencia": "Normal", "color": "Marrón", "presencia_parasitos": false, "nota": "sin signos"}',
    )
    expect(limpio.registrar_evento).toBe(false)
    const sucio = parseVisionProposal(
      'fecal',
      '{"consistencia": "Diarrea", "color": "Sanguinolento", "presencia_parasitos": true, "nota": "signos visibles"}',
    )
    expect(sucio.presencia_parasitos).toBe(true)
    expect(sucio.registrar_evento).toBe(true)
  })
})
