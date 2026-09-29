<template>
  <div class="chart-container relative-position">
    <div v-if="loading" class="absolute-full flex flex-center bg-dark-glass z-10">
      <q-spinner-orbit color="primary" size="3em" />
    </div>

    <div class="row justify-between items-center q-mb-sm">
      <div class="text-subtitle1 text-white">Vigor de pastura (NDVI)</div>
      <div class="row q-gutter-x-md text-caption">
        <div class="row items-center">
          <div class="legend-dot bg-green-13"></div>
          NDVI Sentinel-2
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

function safeFormat(value) {
  if (value === null || value === undefined) return null
  const num = Number(value)
  if (isNaN(num)) return null
  return num.toFixed(2)
}

const chartOption = computed(() => {
  const datos = Array.isArray(props.historial) ? props.historial : []

  const dates = datos.map((h) => {
    if (!h.date) return '-'
    return new Date(h.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  })

  const ndviData = datos.map((h) => safeFormat(h.ndvi))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 30, 0.9)',
      borderColor: '#555',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross' },
    },
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
    yAxis: {
      type: 'value',
      name: 'NDVI',
      min: 0,
      max: 1,
      axisLabel: { color: '#39ff14' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', bottom: 0, borderColor: '#555', fillerColor: 'rgba(255,255,255,0.1)' },
    ],
    series: [
      {
        name: 'NDVI',
        type: 'line',
        smooth: true,
        data: ndviData,
        showSymbol: true,
        symbolSize: 6,
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
