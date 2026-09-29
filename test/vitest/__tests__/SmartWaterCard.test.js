import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SmartWaterCard from 'src/components/agua/SmartWaterCard.vue'
import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-unit-vitest'
import { createTestingPinia } from '@pinia/testing'

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useQuasar: () => ({ notify: vi.fn() }),
  }
})

installQuasarPlugin()

describe('SmartWaterCard.vue', () => {
  it('Renderiza estado PELIGRO y tipo BEBEDERO correctamente', () => {
    const wrapper = mount(SmartWaterCard, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
      props: {
        fuente: {
          id: 1,
          nombre: 'Bebedero Norte',
          tipo: 'Bebedero',
          ultimo_estado: 'Peligro',
          analisis_de_agua: [{ fecha_analisis: '2025-01-01', ph: 9, solidos_totales: 5000 }],
        },
      },
    })
    expect(wrapper.text()).toMatch(/PELIGRO/i)
    expect(wrapper.text()).toContain('Bebedero Norte')
    expect(wrapper.text()).toContain('Bebedero')
  })

  it('Maneja casos DEFAULT (Sin datos / Tipo desconocido)', () => {
    const wrapper = mount(SmartWaterCard, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
      props: {
        fuente: {
          id: 2,
          nombre: 'Fuente X',
          tipo: 'Desconocido',
          ultimo_estado: null,
          analisis_de_agua: [],
        },
      },
    })
    expect(wrapper.text()).toContain('Sin Datos')
    expect(wrapper.text()).toContain('Fuente X')
  })

  it('muestra chip de calidad cuando hay análisis', () => {
    const wrapper = mount(SmartWaterCard, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
      props: {
        fuente: {
          id: 3,
          nombre: 'Tanque',
          tipo: 'Tanque',
          ultimo_estado: 'Óptimo',
          analisis_de_agua: [{ fecha_analisis: '2025-06-01', ph: 7, solidos_totales: 800 }],
        },
      },
    })
    expect(wrapper.text()).toMatch(/pH/i)
    expect(wrapper.text()).toContain('Tanque')
  })
})
