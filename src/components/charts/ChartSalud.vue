<template>
  <div class="chart-container" :class="{ 'print-mode': isPrintMode }">
    <div class="chart-header row items-center justify-between q-pb-sm">
      <div class="row items-center">
        <q-icon
          name="health_and_safety"
          :color="isPrintMode ? 'black' : 'cyan-accent-3'"
          size="sm"
          class="q-mr-sm"
        />
        <div class="text-h6" :class="isPrintMode ? 'text-black' : 'text-white'">
          Salud del Rodeo
        </div>
      </div>
      <div class="text-caption" :class="isPrintMode ? 'text-grey-8' : 'text-grey-5'">
        Total: {{ chartSeriesData.totalLotes }} lotes registrados
      </div>
    </div>

    <div class="chart-wrapper">
      <v-chart v-if="hasData" ref="vchartRef" class="chart" :option="option" autoresize />
      <div
        v-else
        class="flex flex-center full-height text-grey-6 text-center column"
        style="min-height: 250px"
      >
        <q-icon name="monitor_heart" size="3em" class="opacity-50" />
        <div class="q-mt-sm">Sin lotes activos</div>
        <div class="text-caption text-grey-7">Agregue lotes al sistema</div>
      </div>
    </div>

    <div v-if="!isPrintMode" class="explanation-box q-mt-sm">
      <div class="row items-center q-mb-xs">
        <q-icon name="fitness_center" color="cyan-accent-3" size="xs" class="q-mr-sm" />
        <span class="text-weight-bold text-white text-caption">Condición Corporal (1-9)</span>
      </div>
      <p class="text-caption text-grey-4 q-mb-none">
        <span class="text-cyan-accent-3">Objetivo (4-6):</span> Estado óptimo.
        <span class="text-white">Alerta (1-3):</span> Flacos.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from 'stores/data-store'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent])

const dataStore = useDataStore()
const vchartRef = ref(null)
const isPrintMode = ref(false)
defineExpose({ vchartRef, isPrintMode })

const chartSeriesData = computed(() => {
  const latestByLote = {}

  // Inicializamos con null para todos los lotes
  dataStore.lotes.forEach((l) => {
    latestByLote[l.id] = null
  })

  // Buscar evaluaciones
  dataStore.evaluaciones.forEach((ev) => {
    // CORRECCIÓN ESLINT: Usar Object.prototype.hasOwnProperty.call
    if (!ev.lote_id || !Object.prototype.hasOwnProperty.call(latestByLote, ev.lote_id)) return

    const existing = latestByLote[ev.lote_id]
    if (!existing || new Date(ev.fecha_evaluacion) > new Date(existing.fecha_evaluacion)) {
      latestByLote[ev.lote_id] = ev
    }
  })

  const counts = { Baja: 0, Media: 0, Alta: 0, SinDatos: 0 }

  Object.values(latestByLote).forEach((ev) => {
    if (!ev) {
      counts.SinDatos++
      return
    }
    const cc = parseFloat(ev.condicion_corporal || 0)
    if (cc >= 1 && cc <= 3) counts.Baja++
    else if (cc >= 4 && cc <= 6) counts.Media++
    else if (cc >= 7) counts.Alta++
    else counts.SinDatos++
  })

  return { counts, totalLotes: dataStore.lotes.length }
})

const hasData = computed(() => dataStore.lotes.length > 0)

const option = computed(() => {
  const { counts } = chartSeriesData.value
  const isPrint = isPrintMode.value
  const textColor = isPrint ? '#000000' : '#ccc'
  // Baja (Mal) -> Blanco
  // Media (Regular) -> Cyan Fluor
  // Alta (Bien) -> Verde Neón
  const colors = isPrint
    ? ['#444', '#888', '#bbb', '#ddd']
    : ['#ffffff', '#00e5ff', '#39ff14', '#4B5563']

  return {
    backgroundColor: 'transparent',
    animation: !isPrint,
    tooltip: { trigger: 'item' },
    grid: { top: 30, bottom: 20, left: 10, right: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Baja (1-3)', 'Media (4-6)', 'Alta (7-9)', 'Sin Datos'],
      axisLabel: { color: textColor, fontSize: 11, interval: 0 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
    series: [
      {
        type: 'bar',
        data: [counts.Baja, counts.Media, counts.Alta, counts.SinDatos],
        barWidth: '50%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params) => colors[params.dataIndex] || '#ccc',
          borderColor: isPrint ? '#000' : 'transparent',
          borderWidth: isPrint ? 1 : 0,
        },
        label: {
          show: true,
          position: 'top',
          color: textColor,
          fontWeight: 'bold',
          formatter: (p) => (p.value > 0 ? p.value : ''),
        },
      },
    ],
  }
})
</script>

<style scoped>
.chart-container {
  background: rgba(15, 15, 20, 0.6);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chart-wrapper {
  flex-grow: 1;
  min-height: 250px;
}
.chart {
  width: 100%;
  height: 100%;
}
.print-mode {
  background: #ffffff !important;
  border: 1px solid #000000 !important;
  color: black !important;
}
.explanation-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
}
.opacity-50 {
  opacity: 0.5;
}
</style>
