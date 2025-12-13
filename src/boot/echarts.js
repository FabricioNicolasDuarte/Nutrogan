import { boot } from 'quasar/wrappers'
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'

import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkLineComponent,
  VisualMapComponent,
} from 'echarts/components'

// --- CORRECCIÓN DEL WARNING ---
// Importamos LabelLayout y UniversalTransition que suelen faltar
import { LabelLayout, UniversalTransition } from 'echarts/features'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent,
  MarkLineComponent,
  VisualMapComponent,
  // Registramos las features faltantes
  LabelLayout,
  UniversalTransition,
])

export default boot(({ app }) => {
  app.component('v-chart', ECharts)
})
