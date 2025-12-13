<template>
  <div class="chart-container relative-position">
    <div class="row justify-between items-center q-mb-sm">
      <div class="text-subtitle1 text-white row items-center">
        <q-icon name="water_drop" color="blue-5" class="q-mr-sm" />
        Precipitaciones (Últimos 6 meses)
      </div>
    </div>
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
])

const props = defineProps({
  registros: { type: Array, default: () => [] },
})

const chartOption = computed(() => {
  // 1. Agrupar por mes
  const meses = {}
  const hoy = new Date()

  // Inicializar últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const key = d.toLocaleString('es-AR', { month: 'short', year: 'numeric' }) // Ej: "nov 2024"
    meses[key] = 0
  }

  // Llenar con datos reales
  props.registros.forEach((reg) => {
    const d = new Date(reg.fecha + 'T00:00:00-03:00') // Ajuste zona horaria
    const key = d.toLocaleString('es-AR', { month: 'short', year: 'numeric' })
    if (meses[key] !== undefined) {
      meses[key] += parseFloat(reg.milimetros)
    }
  })

  const categories = Object.keys(meses)
  const values = Object.values(meses)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 30, 0.9)',
      borderColor: '#39ff14',
      textStyle: { color: '#fff' },
    },
    grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#aaa' },
      axisLine: { lineStyle: { color: '#555' } },
    },
    yAxis: {
      type: 'value',
      name: 'mm',
      nameTextStyle: { color: '#aaa', padding: [0, 20, 0, 0] },
      axisLabel: { color: '#aaa' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [
      {
        name: 'Lluvia Acumulada',
        type: 'bar',
        data: values,
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#00e5ff' }, // Cyan Neón
              { offset: 1, color: '#0037ff' }, // Azul Oscuro
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: '#fff',
          formatter: '{c} mm',
        },
      },
    ],
  }
})
</script>

<style scoped>
.chart-container {
  height: 350px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
}
.chart {
  height: 300px;
}
</style>
