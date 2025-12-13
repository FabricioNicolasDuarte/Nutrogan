<template>
  <q-card flat class="ai-card">
    <q-card-section class="row items-center justify-between">
      <div class="row items-center">
        <q-icon name="psychology" color="cyan-accent-3" size="2em" class="q-mr-sm" />
        <div class="text-h6 text-white">Informe Estratégico & Predicciones</div>
      </div>
      <q-btn
        flat
        round
        dense
        icon="refresh"
        color="white"
        @click="generarReporte"
        :loading="loading"
      >
        <q-tooltip>Regenerar análisis con datos actuales</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator dark inset />

    <q-card-section>
      <div v-if="loading" class="text-center q-pa-lg">
        <div class="text-h6 text-grey-4 q-mb-md">Procesando datos del establecimiento...</div>
        <q-spinner-orbit color="cyan-accent-3" size="4em" />
        <div class="text-caption text-grey-5 q-mt-sm">
          Analizando variables biométricas, climáticas y financieras...
        </div>
      </div>

      <div v-else-if="error" class="text-center text-negative q-pa-md">
        <q-icon name="error_outline" size="3em" />
        <div>{{ error }}</div>
        <q-btn
          label="Reintentar"
          color="negative"
          outline
          class="q-mt-sm"
          @click="generarReporte"
        />
      </div>

      <div v-else class="ai-content q-pa-sm" v-html="reportResult"></div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDataStore } from 'stores/data-store'
import { supabase } from 'boot/supabase'

const dataStore = useDataStore()
const loading = ref(false)
const error = ref(null)
const reportResult = ref('')
const structuredReport = ref([])

// --- COLORES DE SECCIÓN (PALETA NUTROGAN) ---
const C_SEC1 = '#39ff14' // Verde Neón (Diagnóstico)
const C_SEC2 = '#00e5ff' // Cyan Fluor (Zootécnico)
const C_SEC3 = '#ff1744' // Rojo Neón (Riesgos Críticos)
const C_SEC4 = '#2979ff' // Azul Eléctrico (Plan de Acción - Reemplaza Lima)

// --- PARSER HTML A ESTRUCTURA PDF ---
function parseHtmlToStructuredData(htmlString) {
  if (!htmlString) return []
  const cleanHtml = htmlString.replace(/^```html/, '').replace(/```$/, '')
  const div = document.createElement('div')
  div.innerHTML = cleanHtml

  const sections = []
  let currentSection = { title: 'Introducción', paragraphs: [] }

  Array.from(div.children).forEach((el) => {
    const tag = el.tagName.toUpperCase()
    const text = el.innerText.trim()
    if (!text) return

    if (['H1', 'H2', 'H3', 'H4'].includes(tag)) {
      if (currentSection.paragraphs.length > 0) sections.push(currentSection)
      currentSection = { title: text, paragraphs: [] }
    } else if (tag === 'UL' || tag === 'OL') {
      Array.from(el.children).forEach((li) =>
        currentSection.paragraphs.push(`• ${li.innerText.trim()}`),
      )
    } else {
      currentSection.paragraphs.push(text)
    }
  })
  if (currentSection.paragraphs.length > 0) sections.push(currentSection)
  return sections
}

// --- CONTEXTO DE DATOS ---
const globalContext = computed(() => {
  const lotesMetrics = dataStore.lotes.map((l) => {
    const evs = dataStore.evaluaciones
      .filter((e) => e.lote_id === l.id)
      .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))
    const gdpv =
      evs.length >= 2
        ? (
            (evs[0].peso_promedio_kg - evs[1].peso_promedio_kg) /
            ((new Date(evs[0].fecha_evaluacion) - new Date(evs[1].fecha_evaluacion)) /
              (1000 * 60 * 60 * 24))
          ).toFixed(3)
        : 'N/A'
    return { id: l.identificacion, obj: l.objetivo, peso: evs[0]?.peso_promedio_kg || 'N/A', gdpv }
  })

  return JSON.stringify({
    total_cabezas: dataStore.lotes.reduce((a, b) => a + (Number(b.cantidad_animales) || 0), 0),
    lotes: lotesMetrics,
    clima: dataStore.clima?.current || 'N/A',
    pronostico: dataStore.clima?.forecast?.slice(0, 3) || [],
    insumos_criticos: dataStore.inventarioItems
      .filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo_alerta))
      .map((i) => i.nombre),
  })
})

async function generarReporte() {
  loading.value = true
  error.value = null

  try {
    const prompt = `
      Actúa como Consultor Senior en Agronegocios para "Nutrogan".
      Analiza: ${globalContext.value}

      Escribe un INFORME TÉCNICO DETALLADO y PROFESIONAL (mínimo 400 palabras).
      Usa lenguaje técnico agronómico y financiero. Sé crítico con los desvíos.

      ESTRUCTURA HTML OBLIGATORIA (Sin Markdown):
      <h4 style="color:${C_SEC1}">1. DIAGNÓSTICO SITUACIONAL</h4>
      <p>Evalúa la carga animal, el clima actual y su impacto en el bienestar animal. Menciona cifras.</p>

      <h4 style="color:${C_SEC2}">2. ANÁLISIS ZOOTÉCNICO</h4>
      <p>Analiza el G.D.P.V. de los lotes. Identifica ineficiencias de conversión. Compara categorías.</p>

      <h4 style="color:${C_SEC3}">3. MATRIZ DE RIESGOS</h4>
      <p>Cruza pronóstico climático con insumos críticos. ¿Riesgo de barro? ¿Estrés térmico? ¿Falta de stock?</p>

      <h4 style="color:${C_SEC4}">4. PLAN DE ACCIÓN RECOMENDADO</h4>
      <ul>
        <li>Acción correctiva inmediata 1...</li>
        <li>Estrategia nutricional sugerida...</li>
        <li>Proyección económica si se aplica...</li>
      </ul>
    `

    const { data, error: err } = await supabase.functions.invoke('asistente-ia', {
      body: { prompt, dataContext: {} },
    })

    if (err) throw err

    let cleanHtml = data.response
      .replace(/^```html/, '')
      .replace(/```$/, '')
      .trim()
    reportResult.value = cleanHtml
    structuredReport.value = parseHtmlToStructuredData(cleanHtml)
  } catch (e) {
    console.error(e)
    error.value = 'Error al generar informe.'
    const fallback = `<h4 style="color:${C_SEC1}">Informe Offline</h4><p>No se pudo conectar con la IA.</p>`
    reportResult.value = fallback
    structuredReport.value = parseHtmlToStructuredData(fallback)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (dataStore.lotes.length > 0) generarReporte()
})

defineExpose({ structuredReport })
</script>

<style lang="scss" scoped>
.ai-card {
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: 12px;
  min-height: 300px;
}
.ai-content {
  line-height: 1.8;
  color: #e0e0e0;
  font-family: 'Roboto', sans-serif;
  font-size: 0.95rem;

  :deep(h4) {
    margin-top: 1.5rem;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 6px;
  }
  :deep(p) {
    margin-bottom: 1.2rem;
    text-align: justify;
  }
  :deep(li) {
    margin-bottom: 0.5rem;
  }
}
</style>
