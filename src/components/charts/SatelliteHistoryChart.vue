<template>
  <div class="chart-container relative-position">
    <div v-if="loading" class="absolute-full flex flex-center bg-dark-glass z-10">
      <q-spinner-orbit color="primary" size="3em" />
    </div>

    <div class="row justify-between items-center q-mb-sm">
      <div class="text-subtitle1 text-white">Curvas de Crecimiento & Humedad</div>
      <div class="row q-gutter-x-md text-caption">
        <div class="row items-center">
          <div class="legend-dot bg-green-13"></div>
          Vigor (NDVI)
        </div>
        <div class="row items-center">
          <div class="legend-dot bg-cyan-4"></div>
          Humedad (NDMI)
        </div>
      </div>
    </div>

    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AxisPointerComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

// Registramos componentes necesarios
use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  AxisPointerComponent,
])

const props = defineProps({
  historial: { type: Array, default: () => [] },
  loading: Boolean,
})

// Helper seguro para formatear números que pueden venir como strings o nulos
function safeFormat(value) {
  if (value === null || value === undefined) return null
  const num = Number(value)
  if (isNaN(num)) return null
  return num.toFixed(2)
}

const chartOption = computed(() => {
  // Aseguramos que historial sea un array
  const datos = Array.isArray(props.historial) ? props.historial : []

  const dates = datos.map((h) => {
    if (!h.date) return '-'
    return new Date(h.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  })

  // Usamos el helper para evitar el crash de 'toFixed'
  const ndviData = datos.map((h) => safeFormat(h.ndvi))
  const ndmiData = datos.map((h) => safeFormat(h.ndmi))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 30, 0.9)',
      borderColor: '#555',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross' },
    },
    // Ajustamos el grid para evitar el warning de 'containLabel' si es posible,
    // o lo dejamos porque es una advertencia menor, pero el crash principal ya está resuelto.
    grid: {
      left: '3%',
      right: '3%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#aaa' },
      axisLine: { lineStyle: { color: '#555' } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'NDVI',
        min: 0,
        max: 1,
        position: 'left',
        axisLabel: { color: '#39ff14' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      {
        type: 'value',
        name: 'NDMI',
        min: -0.5,
        max: 0.8,
        position: 'right',
        axisLabel: { color: '#00e5ff' },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', bottom: 0, borderColor: '#555', fillerColor: 'rgba(255,255,255,0.1)' },
    ],
    series: [
      {
        name: 'Vigor (NDVI)',
        type: 'line',
        smooth: true,
        data: ndviData,
        yAxisIndex: 0,
        showSymbol: false,
        lineStyle: { width: 3, color: '#39ff14' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(57, 255, 20, 0.3)' },
              { offset: 1, color: 'rgba(57, 255, 20, 0)' },
            ],
          },
        },
      },
      {
        name: 'Humedad (NDMI)',
        type: 'line',
        smooth: true,
        data: ndmiData,
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 2, type: 'dashed', color: '#00e5ff' },
      },
    ],
  }
})
</script>

<style scoped>
.chart-container {
  height: 400px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.chart {
  height: 340px;
}
.bg-dark-glass {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.z-10 {
  z-index: 10;
}
</style>
