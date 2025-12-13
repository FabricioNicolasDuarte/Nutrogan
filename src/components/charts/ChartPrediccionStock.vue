<template>
  <div class="chart-container" :class="{ 'print-mode': isPrintMode }">
    <div class="chart-header row items-center justify-between q-pb-sm">
      <div class="row items-center">
        <q-icon
          name="timelapse"
          :color="isPrintMode ? 'black' : 'blue-13'"
          size="sm"
          class="q-mr-sm"
        />
        <div class="text-h6" :class="isPrintMode ? 'text-black' : 'text-white'">
          Top 5: Alertas de Reposición
        </div>
      </div>
      <div class="text-caption" :class="isPrintMode ? 'text-grey-8' : 'text-grey-5'">
        Basado exclusivamente en consumo real (30d)
      </div>
    </div>

    <div class="chart-wrapper">
      <v-chart v-if="hasData" ref="vchartRef" class="chart" :option="option" autoresize />
      <div v-else class="text-center q-pa-lg text-grey-6 full-height flex flex-center column">
        <q-icon name="check_circle" size="3em" color="green-13" class="opacity-50" />
        <div class="q-mt-sm">Sin alertas críticas</div>
      </div>
    </div>

    <div v-if="!isPrintMode" class="explanation-box q-mt-sm">
      <div class="row items-center q-mb-xs">
        <q-icon name="priority_high" color="blue-13" size="xs" class="q-mr-sm" />
        <span class="text-weight-bold text-white text-caption">Gestión de Insumos</span>
      </div>
      <p class="text-caption text-grey-4 q-mb-none">
        <span class="text-white">Blanco (≤ 7 días):</span> Compra urgente.
        <br />
        <span class="text-blue-13">Azul (≤ 30 días):</span> Planificar reposición.
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
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent])

const dataStore = useDataStore()
const vchartRef = ref(null)
const isPrintMode = ref(false)
defineExpose({ vchartRef, isPrintMode })

const analysisData = computed(() => {
  const items = dataStore.inventarioItems || []
  const movimientos = dataStore.inventarioMovimientos || []
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const consumoPorItem = {}
  movimientos.forEach((m) => {
    if (
      m.tipo_movimiento &&
      m.tipo_movimiento.toLowerCase() === 'uso' &&
      new Date(m.fecha) >= thirtyDaysAgo
    ) {
      if (!consumoPorItem[m.item_id]) consumoPorItem[m.item_id] = 0
      consumoPorItem[m.item_id] += Math.abs(Number(m.cantidad) || 0)
    }
  })

  const proyecciones = items
    .map((item) => {
      const stock = Number(item.stock_actual) || 0
      const consumoMes = consumoPorItem[item.id] || 0
      if (stock <= 0) return { name: item.nombre, days: 0, stock, unit: item.unidad, valid: true }
      if (consumoMes === 0) return { valid: false }
      const diario = consumoMes / 30
      const days = Math.floor(stock / diario)
      return { name: item.nombre, days: days, stock: stock, unit: item.unidad, valid: true }
    })
    .filter((p) => p.valid && p.days < 180)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5)

  return proyecciones
})

const hasData = computed(() => analysisData.value.length > 0)

const option = computed(() => {
  const data = analysisData.value
  const categories = data.map((d) => d.name)
  const values = data.map((d) => d.days)
  const isPrint = isPrintMode.value
  const textColor = isPrint ? '#000000' : '#cccccc'
  const getColor = (val) => {
    if (val <= 7) return '#ffffff' // Blanco (Crítico Máximo)
    if (val <= 30) return '#2979ff' // Azul Eléctrico (Atención)
    if (val <= 60) return '#00e5ff' // Cyan Fluor (Seguro)
    return '#39ff14' // Verde Neón (Muy Seguro)
  }

  return {
    backgroundColor: 'transparent',
    animation: !isPrint,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 20, 30, 0.9)',
      borderColor: '#555',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        const i = params[0].dataIndex
        const item = data[i]
        return `<b>${item.name}</b><br/>Stock Actual: ${item.stock} ${item.unit}<br/>Autonomía est: <b style="color:${getColor(item.days)}">${item.days} días</b>`
      },
    },
    grid: { top: 10, bottom: 20, left: 10, right: 35, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Días',
      nameTextStyle: { color: textColor, padding: [0, 0, 0, 10] },
      axisLabel: { color: textColor },
      splitLine: {
        lineStyle: { color: isPrint ? '#ccc' : 'rgba(255,255,255,0.1)', type: 'dashed' },
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: textColor, width: 85, overflow: 'truncate' },
      axisLine: { show: false },
      axisTick: { show: false },
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: '50%',
        label: { show: true, position: 'right', color: textColor, formatter: '{c} d' },
        itemStyle: {
          color: (p) => {
            const val = p.value
            if (isPrint) return val < 15 ? '#333' : val < 45 ? '#666' : '#aaa'
            return getColor(val)
          },
          borderRadius: [0, 4, 4, 0],
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
