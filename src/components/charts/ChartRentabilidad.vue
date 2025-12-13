<template>
  <div class="chart-container" :class="{ 'print-mode': isPrintMode }">
    <div class="chart-header row items-center justify-between q-pb-sm col-auto">
      <div class="row items-center">
        <q-icon
          name="monetization_on"
          :color="isPrintMode ? 'black' : 'green-13'"
          size="sm"
          class="q-mr-sm"
        />
        <div class="text-h6" :class="isPrintMode ? 'text-black' : 'text-white'">
          Margen Operativo
        </div>
      </div>
      <div class="text-caption" :class="isPrintMode ? 'text-grey-8' : 'text-grey-5'">
        Ref: ${{ precioMercado }}/kg | Producción Est: {{ totalKilosGanadosMes }} kg/mes
      </div>
    </div>

    <div v-if="hasData" class="chart-wrapper col relative-position">
      <v-chart ref="vchartRef" class="chart" :option="option" autoresize />
    </div>
    <div
      v-else
      class="flex flex-center chart-wrapper text-grey-6 text-center col"
      style="min-height: 200px"
    >
      <div>
        <q-icon name="bar_chart_off" size="3em" />
        <div class="q-mt-sm">Sin datos de movimientos</div>
      </div>
    </div>

    <div v-if="!isPrintMode" class="explanation-box q-mt-sm col-auto">
      <div class="row items-center q-mb-xs">
        <q-icon name="lightbulb" color="green-13" size="xs" class="q-mr-sm" />
        <span class="text-weight-bold text-white text-caption">Análisis Financiero</span>
      </div>
      <p class="text-caption text-grey-4 q-mb-none">
        Comparativa: <strong>Costo Operativo Real</strong> (Barras Blancas) vs
        <strong>Capacidad Productiva Actual</strong> (Barras Verdes).
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

const props = defineProps({ precioMercado: { type: Number, default: 2200 } })
const dataStore = useDataStore()
const vchartRef = ref(null)
const isPrintMode = ref(false)
defineExpose({ vchartRef, isPrintMode })

const totalKilosGanadosMes = computed(() => {
  let gananciaDiariaTotal = 0
  dataStore.lotes.forEach((lote) => {
    const evalsLote = dataStore.evaluaciones.filter((e) => e.lote_id === lote.id)
    let gdpv = 0.5 // Default conservador
    if (dataStore.getGDPV && evalsLote.length >= 2) {
      const calc = parseFloat(dataStore.getGDPV(evalsLote))
      if (!isNaN(calc) && calc > -0.5 && calc < 3) gdpv = calc
    }
    const cabezas = Number(lote.cantidad_animales) || 0
    gananciaDiariaTotal += cabezas * gdpv
  })
  return (gananciaDiariaTotal * 30).toFixed(0)
})

const option = computed(() => {
  const monthlyStats = {}

  const usos = dataStore.inventarioMovimientos.filter(
    (m) => m.tipo_movimiento && m.tipo_movimiento.toLowerCase() === 'uso',
  )

  usos.forEach((mov) => {
    const d = new Date(mov.fecha)
    if (isNaN(d.getTime())) return

    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!monthlyStats[k]) monthlyStats[k] = { costo: 0, valor: 0 }

    let val = Number(mov.costo_total)
    if (!val && mov.cantidad && mov.inventario_items?.precio_unitario) {
      val = Math.abs(Number(mov.cantidad)) * Number(mov.inventario_items.precio_unitario)
    }

    if (!isNaN(val)) {
      monthlyStats[k].costo += val
    }
  })

  const valorMes = parseFloat(totalKilosGanadosMes.value) * props.precioMercado
  const today = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyStats[k]) monthlyStats[k] = { costo: 0, valor: 0 }
    monthlyStats[k].valor = valorMes
  }

  const sortedKeys = Object.keys(monthlyStats).sort().slice(-6)
  const labels = sortedKeys.map((k) => {
    const [y, m] = k.split('-')
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1)
    return dateObj.toLocaleDateString('es-AR', { month: 'short' })
  })

  const isPrint = isPrintMode.value
  const textColor = isPrint ? '#000' : '#ccc'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        let res = `<b>${params[0].axisValueLabel}</b><br/>`
        params.forEach((p) => {
          res += `${p.marker} ${p.seriesName}: $${parseInt(p.value).toLocaleString('es-AR')}<br/>`
        })
        const costo = params.find((p) => p.seriesName === 'Costo Operativo')?.value || 0
        const valor = params.find((p) => p.seriesName === 'Valor Producido (Est.)')?.value || 0
        const margen = valor - costo
        const color = margen >= 0 ? '#39ff14' : '#ff1744'
        res += `<b style="color:${color}">Margen: $${parseInt(margen).toLocaleString('es-AR')}</b>`
        return res
      },
    },
    legend: { textStyle: { color: textColor }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: textColor },
      axisLine: { lineStyle: { color: textColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor, formatter: (value) => `$${value / 1000}k` },
      splitLine: {
        lineStyle: { color: isPrint ? '#ccc' : 'rgba(255,255,255,0.1)', type: 'dashed' },
      },
    },
    series: [
      {
        name: 'Costo Operativo',
        type: 'bar',
        data: sortedKeys.map((k) => monthlyStats[k].costo.toFixed(0)),
        itemStyle: { color: isPrint ? '#666' : '#ffffff', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Valor Producido (Est.)',
        type: 'bar',
        data: sortedKeys.map((k) => monthlyStats[k].valor.toFixed(0)),
        itemStyle: { color: isPrint ? '#ccc' : '#39ff14', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

const hasData = computed(
  () => parseFloat(totalKilosGanadosMes.value) > 0 || dataStore.inventarioMovimientos.length > 0,
)
</script>

<style scoped>
.chart-container {
  background: rgba(15, 15, 20, 0.6);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.chart-wrapper {
  width: 100%;
  min-height: 0; /* Important for flex container */
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
</style>
