<template>
  <div class="chart-container" :class="{ 'print-mode': isPrintMode }">
    <div class="chart-header row items-center q-pb-sm">
      <q-icon
        name="trending_up"
        :color="isPrintMode ? 'black' : 'green-13'"
        size="sm"
        class="q-mr-sm"
      />
      <div class="text-h6" :class="isPrintMode ? 'text-black' : 'text-white'">
        Evolución de Peso
      </div>
    </div>

    <div class="chart-wrapper">
      <v-chart v-if="hasData" ref="vchartRef" class="chart" :option="option" autoresize />
      <div
        v-else
        class="flex flex-center full-height text-grey-6 text-center column"
        style="min-height: 250px"
      >
        <q-icon name="scale" size="3em" class="opacity-50" />
        <div class="q-mt-sm">Sin evaluaciones de peso</div>
      </div>
    </div>

    <div v-if="!isPrintMode" class="explanation-box q-mt-sm">
      <div class="row items-center q-mb-xs">
        <q-icon name="show_chart" color="green-13" size="xs" class="q-mr-sm" />
        <span class="text-weight-bold text-white text-caption">Curva de Crecimiento</span>
      </div>
      <p class="text-caption text-grey-4 q-mb-none">Peso promedio histórico.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from 'stores/data-store'
import { use, graphic } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, TitleComponent, LegendComponent])

const dataStore = useDataStore()
const vchartRef = ref(null)
const isPrintMode = ref(false)
defineExpose({ vchartRef, isPrintMode })

const chartData = computed(() => {
  const monthlyStats = {}
  dataStore.evaluaciones.forEach((ev) => {
    if (!ev.fecha_evaluacion || !ev.peso_promedio_kg) return
    const peso = parseFloat(ev.peso_promedio_kg)
    if (peso <= 0 || peso > 1500) return
    const [y, m] = ev.fecha_evaluacion.split('T')[0].split('-')
    const key = `${y}-${m}`
    if (!monthlyStats[key]) monthlyStats[key] = { totalPeso: 0, count: 0 }
    monthlyStats[key].totalPeso += peso
    monthlyStats[key].count += 1
  })
  return Object.keys(monthlyStats)
    .sort()
    .map((key) => {
      const item = monthlyStats[key]
      return [key, (item.totalPeso / item.count).toFixed(2)]
    })
})

const hasData = computed(() => chartData.value.length > 0)

const option = computed(() => {
  const isPrint = isPrintMode.value
  const lineColor = isPrint ? '#000000' : '#39ff14' // Verde Neón
  const textColor = isPrint ? '#000000' : '#888'
  const areaGradient = isPrint
    ? null
    : new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(57, 255, 20, 0.4)' },
        { offset: 1, color: 'rgba(57, 255, 20, 0)' },
      ])
  const areaColor = isPrint ? '#cccccc' : undefined

  return {
    backgroundColor: isPrint ? '#ffffff' : 'transparent',
    animation: !isPrint,
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        const [y, m] = p.axisValue.split('-')
        const dateStr = `${m}/${y}`
        return `<b>${dateStr}</b><br/>Promedio: <b>${p.value[1]} kg</b>`
      },
    },
    grid: { top: 30, bottom: 20, left: 10, right: 10, containLabel: true },
    xAxis: {
      type: 'category',
      axisLabel: {
        color: textColor,
        formatter: (val) => {
          const [y, m] = val.split('-')
          return `${m}/${y.slice(2)}`
        },
      },
      axisLine: { show: true, lineStyle: { color: isPrint ? '#000' : '#333' } },
    },
    yAxis: {
      type: 'value',
      name: 'kg',
      scale: true,
      axisLabel: { color: textColor },
      splitLine: {
        lineStyle: { color: isPrint ? '#ccc' : 'rgba(255,255,255,0.1)', type: 'dashed' },
      },
    },
    series: [
      {
        name: 'Peso Promedio',
        type: 'line',
        smooth: true,
        data: chartData.value,
        lineStyle: { width: 3, color: lineColor },
        itemStyle: { color: lineColor, borderColor: '#fff', borderWidth: 1 },
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: { color: isPrint ? areaColor : areaGradient, opacity: isPrint ? 0.3 : 1 },
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
  color: #000 !important;
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
