<template>
  <q-page padding class="dashboard-pro-bg text-white font-outfit q-pb-xl">
    <div class="relative-position q-mb-xl q-pt-sm" style="min-height: 60px">
      <div class="absolute-left" style="z-index: 10">
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          color="white"
          @click="$router.back()"
          class="glass-btn"
        />
      </div>

      <div class="absolute-center full-width text-center pointer-events-none" style="z-index: 0">
        <div class="page-title-box shadow-5" style="margin: 0; pointer-events: auto">
          Reporte Inteligente
        </div>
        <div class="text-caption text-grey-5 q-mt-xs font-mono">
          {{ fechaActual }}
        </div>
      </div>

      <div class="absolute-right" style="z-index: 10">
        <q-btn
          flat
          round
          dense
          icon="picture_as_pdf"
          color="cyan-accent-3"
          @click="exportarPDFMaestro"
          :loading="pdfLoading"
          class="glass-btn"
        >
          <q-tooltip class="bg-dark border-neon">Exportar PDF Oficial</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="q-px-md">
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
            <q-card-section>
              <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
                Valuación
              </div>
              <div class="text-h4 text-weight-bold text-primary font-numeric text-glow">
                ${{ formatCurrencyShort(kpiData.valuacion) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
            <q-card-section>
              <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
                Stock Vivo
              </div>
              <div class="text-h4 text-weight-bold text-cyan-accent-3 font-numeric">
                {{ kpiData.cabezas }} <span class="text-subtitle2 text-grey-5">cab</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat class="kpi-card relative-position overflow-hidden border-white-left">
            <q-card-section>
              <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
                Alertas
              </div>
              <div class="text-h4 text-weight-bold text-white font-numeric">
                {{ kpiData.alertas }} <span class="text-subtitle2 text-grey-5">ítems</span>
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-card flat class="kpi-card relative-position overflow-hidden border-blue-left">
            <q-card-section>
              <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
                Clima
              </div>
              <div class="text-h4 text-weight-bold text-blue-13 font-numeric">
                {{ dataStore.clima?.current?.temperature_2m || '-' }}°C
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-lg q-mb-lg items-stretch">
        <div class="col-12 col-lg-9">
          <div class="glass-card full-height q-pa-sm" style="min-height: 420px">
            <ChartRentabilidad
              ref="chartRentabilidadRef"
              :precio-mercado="dataStore.marketPrice.value"
            />
          </div>
        </div>

        <div class="col-12 col-lg-3">
          <div class="column full-height">
            <MarketPriceWidget class="full-height" />
          </div>
        </div>
      </div>

      <div class="row q-col-gutter-lg q-mb-lg">
        <div class="col-12 col-md-4">
          <div class="glass-card full-height q-pa-xs" style="min-height: 350px">
            <ChartEficiencia ref="chartEficienciaRef" />
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="glass-card full-height q-pa-xs" style="min-height: 350px">
            <ChartSalud ref="chartSaludRef" />
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="glass-card full-height q-pa-xs" style="min-height: 350px">
            <ChartPrediccionStock ref="chartStockRef" />
          </div>
        </div>
      </div>

      <div class="row q-mb-lg">
        <div class="col-12">
          <GlobalAiReport ref="aiReportRef" class="glass-card" />
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <LotMetricsTable ref="lotMetricsTableRef" class="glass-card" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import reportBg from 'src/assets/report/report-bg-white.png'

// Componentes
import GlobalAiReport from 'components/charts/GlobalAiReport.vue'
import ChartEficiencia from 'components/charts/ChartEficiencia.vue'
import ChartSalud from 'components/charts/ChartSalud.vue'
import ChartRentabilidad from 'components/charts/ChartRentabilidad.vue'
import ChartPrediccionStock from 'components/charts/ChartPrediccionStock.vue'
import LotMetricsTable from 'components/tables/LotMetricsTable.vue'
import MarketPriceWidget from 'components/dashboard/MarketPriceWidget.vue'

const dataStore = useDataStore()
const $q = useQuasar()
const pdfLoading = ref(false)

// Refs
const aiReportRef = ref(null)
const chartRentabilidadRef = ref(null)
const chartStockRef = ref(null)
const chartEficienciaRef = ref(null)
const chartSaludRef = ref(null)
const lotMetricsTableRef = ref(null)

const fechaActual = new Date().toLocaleDateString('es-AR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// --- KPIs Superiores ---
const kpiData = computed(() => {
  const items = dataStore.inventarioItems || []
  const lotes = dataStore.lotes || []

  // Valuación
  const valuacion = items.reduce((acc, item) => {
    return acc + (Number(item.stock_actual) || 0) * (Number(item.precio_unitario) || 0)
  }, 0)

  // Cabezas
  const cabezas = lotes.reduce((acc, l) => acc + (Number(l.cantidad_animales) || 0), 0)

  // Alertas (Usando Number para comparación segura)
  const alertas = items.filter(
    (i) => (Number(i.stock_actual) || 0) <= (Number(i.stock_minimo_alerta) || 0),
  ).length

  return { valuacion, cabezas, alertas }
})

onMounted(async () => {
  await dataStore.fetchAll()
  await dataStore.fetchAllEvaluaciones()
  if (dataStore.marketPrice.mode === 'auto') {
    dataStore.fetchMarketPriceAuto()
  }
})

// --- HELPERS ---
function formatCurrencyShort(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(0) + 'k'
  return val.toFixed(0)
}

function capitalize(str) {
  if (!str) return '-'
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function calcularEstadoPotrero(ndvi) {
  if (typeof ndvi !== 'number') return 'Sin Datos'
  if (ndvi >= 0.6) return 'Óptimo'
  if (ndvi >= 0.4) return 'Bueno'
  if (ndvi >= 0.2) return 'Regular'
  return 'Crítico'
}

function getUltimoPeso(lote) {
  const evaluaciones = dataStore.evaluaciones
    .filter((e) => e.lote_id === lote.id)
    .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))

  if (evaluaciones.length > 0) {
    const val = parseFloat(evaluaciones[0].peso_promedio_kg)
    return isNaN(val) ? '-' : val.toFixed(1)
  }
  const ingreso = parseFloat(lote.peso_ingreso_kg)
  return isNaN(ingreso) ? '-' : ingreso.toFixed(1)
}

function generarPlanAccionDetallado() {
  const secciones = []
  // Insumos
  const itemsCriticos = dataStore.inventarioItems.filter(
    (i) => (Number(i.stock_actual) || 0) <= (Number(i.stock_minimo_alerta) || 0),
  )
  let textItems =
    'El inventario actual se encuentra en niveles saludables y no requiere reposición inmediata.'
  if (itemsCriticos.length > 0) {
    const nombres = itemsCriticos
      .map((i) => `${i.nombre} (${i.stock_actual} ${i.unidad})`)
      .join(', ')
    textItems = `Se detectó un quiebre de stock inminente en los siguientes ítems: ${nombres}. Se recomienda proceder con la compra inmediata para evitar la interrupción del plan nutricional y sanitario.`
  }
  secciones.push({ titulo: 'Gestión de Insumos', cuerpo: textItems })

  // Resumen Ejecutivo
  const cabezasTotal = dataStore.lotes.reduce((acc, l) => acc + (l.cantidad_animales || 0), 0)
  const precioRef = dataStore.marketPrice.value
    ? dataStore.marketPrice.value.toLocaleString('es-AR')
    : '-'

  secciones.push({
    titulo: 'Resumen Ejecutivo',
    cuerpo: `Con un stock total de ${cabezasTotal} cabezas y un precio de referencia de mercado de $${precioRef}/kg, el establecimiento presenta una base productiva activa. Se sugiere monitorear la eficiencia de conversión en los lotes de terminación.`,
  })

  return secciones
}

// --- GENERACIÓN PDF (Lógica Original Optimizada) ---
async function exportarPDFMaestro() {
  pdfLoading.value = true
  const notif = $q.notify({
    type: 'ongoing',
    message: 'Maquetando documento científico...',
    spinner: true,
    timeout: 0,
  })

  const getChartRefs = () => [
    chartRentabilidadRef,
    chartStockRef,
    chartEficienciaRef,
    chartSaludRef,
  ]

  try {
    // 1. Preparar Gráficos (Modo Impresión ON)
    getChartRefs().forEach((c) => {
      if (c.value) c.value.isPrintMode = true
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 25.4
    const topMargin = 35
    const bottomMargin = 25.4
    const contentW = pageW - margin * 2
    const bottomLimit = pageH - bottomMargin
    let cursorY = topMargin
    let pageNum = 1
    const tocItems = []
    let tocLocation = null
    const fontMain = 'times'
    const sizeBody = 12
    const sizeH1 = 14
    const sizeH2 = 12
    const sizeCaption = 10
    const lineH = 8
    const lhFactor = 1.9
    const initializedPages = new Set()

    const initializePage = (forceNew = false) => {
      if (forceNew) {
        doc.addPage()
        pageNum++
        cursorY = topMargin
      }
      const currentDocPage = doc.internal.getCurrentPageInfo().pageNumber
      if (initializedPages.has(currentDocPage)) return
      try {
        doc.addImage(reportBg, 'PNG', 0, 0, pageW, pageH)
      } catch {
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, pageW, pageH, 'F')
      }
      doc.setFont(fontMain, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(80)
      const titleShort = (dataStore.establecimientoActual?.nombre || 'NUTROGAN').toUpperCase()
      doc.text(`REPORTE TÉCNICO: ${titleShort}`, margin, 15)
      doc.text(`${pageNum}`, pageW - margin, 15, { align: 'right' })
      doc.setTextColor(0)
      initializedPages.add(currentDocPage)
    }

    initializePage()

    const ensureSpace = (heightNeeded) => {
      if (cursorY + heightNeeded > bottomLimit) {
        initializePage(true)
        return true
      }
      return false
    }

    const resetBodyFont = () => {
      doc.setFont(fontMain, 'normal')
      doc.setFontSize(sizeBody)
      doc.setTextColor(0)
    }

    const printSmartText = (text, type = 'p') => {
      if (!text) return
      if (type === 'h1') {
        doc.setFont(fontMain, 'bold')
        doc.setFontSize(sizeH1)
        ensureSpace(25)
        doc.text(text, pageW / 2, cursorY, { align: 'center' })
        cursorY += lineH * 1.8
        return
      }
      if (type === 'h2') {
        doc.setFont(fontMain, 'bold')
        doc.setFontSize(sizeH2)
        ensureSpace(20)
        doc.text(text, margin, cursorY)
        cursorY += lineH * 1.5
        return
      }
      if (type === 'h3') {
        doc.setFont(fontMain, 'bold')
        doc.setFontSize(sizeBody)
        ensureSpace(15)
        doc.text(text, margin, cursorY)
        cursorY += lineH * 1.2
        return
      }
      resetBodyFont()
      const cleanText = text.replace(/(\r\n|\n|\r)/gm, ' ').trim()
      const isBullet = cleanText.startsWith('•') || cleanText.startsWith('-')
      let textToProcess = cleanText
      let currentIndent = margin
      let currentWidth = contentW
      if (isBullet) {
        textToProcess = cleanText.substring(1).trim()
        if (ensureSpace(lineH)) resetBodyFont()
        doc.text('•', margin + 5, cursorY)
        currentIndent = margin + 10
        currentWidth = contentW - 10
      }
      const allLines = doc.splitTextToSize(textToProcess, currentWidth)
      let currentLineIndex = 0
      while (currentLineIndex < allLines.length) {
        const spaceLeft = bottomLimit - cursorY
        const linesThatFit = Math.floor(spaceLeft / lineH)
        if (linesThatFit < 2 && allLines.length - currentLineIndex > 2) {
          initializePage(true)
          resetBodyFont()
          continue
        }
        if (linesThatFit <= 0) {
          initializePage(true)
          resetBodyFont()
          continue
        }
        const linesToPrint = allLines.slice(currentLineIndex, currentLineIndex + linesThatFit)
        doc.text(linesToPrint, currentIndent, cursorY, {
          maxWidth: currentWidth,
          align: 'justify',
          lineHeightFactor: lhFactor,
        })
        cursorY += linesToPrint.length * lineH
        currentLineIndex += linesToPrint.length
      }
      cursorY += lineH * 0.5
    }

    let tableCount = 1
    const printTable = (title, head, body) => {
      const estimatedTableHeight = 15 + body.length * 8 + 15
      if (cursorY + estimatedTableHeight > bottomLimit) {
        initializePage(true)
      } else {
        ensureSpace(45)
      }
      doc.setFont(fontMain, 'bold')
      doc.setFontSize(sizeBody)
      doc.text(`Tabla ${tableCount}`, margin, cursorY)
      cursorY += 6
      doc.setFont(fontMain, 'italic')
      doc.text(title, margin, cursorY)
      cursorY += 4
      autoTable(doc, {
        startY: cursorY,
        head: head,
        body: body,
        theme: 'plain',
        styles: {
          font: fontMain,
          fontSize: 10,
          cellPadding: 3,
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: { fontStyle: 'bold', lineWidth: { bottom: 0.5, top: 0.5 }, lineColor: 0 },
        margin: { top: topMargin, bottom: bottomMargin, left: margin, right: margin },
        didParseCell: (data) => {
          if (data.row.index === data.table.body.length - 1) {
            data.cell.styles.lineWidth = { bottom: 0.5 }
            data.cell.styles.lineColor = 0
          }
        },
        willDrawPage: () => {
          const newPageNum = doc.internal.getCurrentPageInfo().pageNumber
          if (!initializedPages.has(newPageNum)) {
            pageNum = newPageNum
            initializePage(false)
          }
        },
        didDrawPage: (data) => {
          cursorY = data.cursor.y
        },
      })
      cursorY = doc.lastAutoTable.finalY + 15
      tableCount++
    }

    const printSignatureSection = () => {
      const boxHeight = 40
      ensureSpace(boxHeight + 20)
      cursorY += 10
      const signatureLineY = cursorY + 25
      const centerX = pageW / 2
      const lineLength = 80
      doc.setLineWidth(0.5)
      doc.line(centerX - lineLength / 2, signatureLineY, centerX + lineLength / 2, signatureLineY)
      doc.setFont(fontMain, 'normal')
      doc.setFontSize(10)
      doc.text('Firma y Aclaración', centerX, signatureLineY + 5, { align: 'center' })
      doc.text('Carácter / Profesión', centerX, signatureLineY + 10, { align: 'center' })
      cursorY += boxHeight
    }

    let coverY = pageH / 3
    doc.setFont(fontMain, 'bold')
    doc.setFontSize(18)
    doc.text('INFORME TÉCNICO INTEGRAL', pageW / 2, coverY, { align: 'center' })
    coverY += 15
    doc.setFontSize(14)
    doc.text('ANÁLISIS DE SITUACIÓN Y PROYECCIONES', pageW / 2, coverY, { align: 'center' })
    coverY += 50
    doc.setFont(fontMain, 'normal')
    doc.setFontSize(12)
    doc.text(
      `Establecimiento: ${dataStore.establecimientoActual?.nombre || 'NUTROGAN'}`,
      pageW / 2,
      coverY,
      { align: 'center' },
    )
    coverY += 12
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageW / 2, coverY, {
      align: 'center',
    })

    initializePage(true)
    tocLocation = { page: pageNum, cursor: cursorY }
    doc.setFont(fontMain, 'bold')
    doc.setFontSize(14)
    doc.text('ÍNDICE', pageW / 2, cursorY, { align: 'center' })
    initializePage(true)

    tocItems.push({ title: '1. Estado de Situación Actual', page: pageNum })
    printSmartText('1. Estado de Situación Actual', 'h1')
    printSmartText(
      'El siguiente reporte consolida la información técnica, biológica y financiera del establecimiento. Los datos han sido procesados bajo estándares de trazabilidad.',
    )
    printSmartText('1.1. Estructura Forrajera (Potreros)', 'h2')
    const potrerosData = dataStore.potreros.map((p) => [
      p.nombre,
      `${(Number(p.superficie_ha) || 0).toFixed(2)} ha`,
      capitalize(p.tipo),
      typeof p.ultimo_ndvi === 'number' ? p.ultimo_ndvi.toFixed(2) : '-',
      calcularEstadoPotrero(p.ultimo_ndvi),
    ])
    printTable(
      'Detalle de potreros y estado satelital',
      [['Nombre', 'Superficie', 'Tipo Recurso', 'NDVI', 'Condición']],
      potrerosData,
    )
    printSmartText('1.2. Existencias Ganaderas', 'h2')
    const lotesData = dataStore.lotes.map((l) => [
      l.identificacion,
      capitalize(l.objetivo),
      l.cantidad_animales,
      `${getUltimoPeso(l)} kg`,
      l.potreros?.nombre || 'Corral',
    ])
    lotesData.push([
      'TOTAL',
      '-',
      dataStore.lotes.reduce((acc, l) => acc + (Number(l.cantidad_animales) || 0), 0),
      '-',
      '-',
    ])
    printTable(
      'Composición de lotes activos',
      [['ID Lote', 'Objetivo', 'Cabezas', 'Peso Actual', 'Ubicación']],
      lotesData,
    )
    printSmartText('1.3. Recursos Hídricos', 'h2')
    const aguaData = dataStore.fuentesAgua.map((f) => {
      const an = f.analisis_de_agua?.[0]
      return [
        f.nombre,
        f.tipo,
        f.ultimo_estado || '-',
        an ? an.ph : '-',
        an ? `${an.solidos_totales} ppm` : '-',
      ]
    })
    printTable(
      'Calidad de fuentes de agua',
      [['Fuente', 'Tipo', 'Estado', 'pH', 'Sólidos']],
      aguaData.length ? aguaData : [['Sin fuentes', '-', '-', '-', '-']],
    )
    printSmartText('1.4. Registro Pluviométrico', 'h2')
    const lluviaData = dataStore.registrosLluvia
      .slice(0, 5)
      .map((r) => [
        new Date(r.fecha).toLocaleDateString('es-AR'),
        `${r.milimetros} mm`,
        r.observaciones || '-',
      ])
    printTable(
      'Últimos eventos de precipitación',
      [['Fecha', 'Milímetros', 'Observaciones']],
      lluviaData.length ? lluviaData : [['Sin lluvias', '-', '-']],
    )

    initializePage(true)
    tocItems.push({ title: '2. Análisis de Inteligencia Artificial', page: pageNum })
    printSmartText('2. Análisis de Inteligencia Artificial', 'h1')
    const aiSections = aiReportRef.value?.structuredReport || []
    if (aiSections.length > 0) {
      aiSections.forEach((sec) => {
        printSmartText(sec.title, 'h2')
        if (sec.paragraphs) {
          sec.paragraphs.forEach((p) => {
            if (/^\d+\.\s+[A-ZÁÉÍÓÚÑ\s]+$/.test(p.trim()) || /^[A-ZÁÉÍÓÚÑ\s]+$/.test(p.trim())) {
              printSmartText(p, 'h3')
            } else {
              printSmartText(p)
            }
          })
        }
        cursorY += 5
      })
    } else {
      printSmartText('El análisis de inteligencia artificial no se encuentra disponible.')
    }

    initializePage(true)
    tocItems.push({ title: '3. Anexo Gráfico de Rendimiento', page: pageNum })
    printSmartText('3. Anexo Gráfico de Rendimiento', 'h1')
    const charts = [
      { ref: chartRentabilidadRef, title: 'Figura 1. Margen Operativo Estimado' },
      { ref: chartStockRef, title: 'Figura 2. Proyección de Stock' },
      { ref: chartEficienciaRef, title: 'Figura 3. Curva de Peso' },
      { ref: chartSaludRef, title: 'Figura 4. Salud del Rodeo' },
    ]
    for (const c of charts) {
      if (c.ref.value) {
        const el = c.ref.value.$el.querySelector('.chart-container') || c.ref.value.$el
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
        const imgData = canvas.toDataURL('image/png')
        const imgH = (canvas.height * contentW) / canvas.width
        ensureSpace(imgH + 25)
        doc.setFont(fontMain, 'bold')
        doc.setFontSize(sizeCaption)
        doc.text(c.title.split('.')[0], margin, cursorY)
        cursorY += 5
        doc.setFont(fontMain, 'italic')
        doc.text(c.title.split('. ')[1], margin, cursorY)
        cursorY += 5
        doc.addImage(imgData, 'PNG', margin, cursorY, contentW, imgH)
        cursorY += imgH + 20
        doc.setFontSize(sizeBody)
      }
    }

    ensureSpace(60)
    tocItems.push({ title: '4. Plan de Acción y Conclusiones', page: pageNum })
    printSmartText('4. Plan de Acción y Conclusiones', 'h1')
    const conclusiones = generarPlanAccionDetallado()
    conclusiones.forEach((c) => {
      printSmartText(c.titulo, 'h2')
      printSmartText(c.cuerpo)
    })
    printSignatureSection()

    if (tocLocation) {
      doc.setPage(tocLocation.page)
      let idxY = tocLocation.cursor + 20
      doc.setFont(fontMain, 'normal')
      doc.setFontSize(12)
      tocItems.forEach((item) => {
        doc.text(item.title, margin, idxY)
        doc.text(String(item.page), pageW - margin, idxY, { align: 'right' })
        const titleWidth = doc.getTextWidth(item.title)
        doc.setLineDash([1, 1], 0)
        doc.line(margin + titleWidth + 2, idxY - 1, pageW - margin - 10, idxY - 1)
        doc.setLineDash([])
        idxY += 12
      })
    }

    const dateStr = new Date().toISOString().slice(0, 10)
    doc.save(`Reporte_Tecnico_${dateStr}.pdf`)
    notif({
      type: 'positive',
      message: 'PDF Generado Correctamente',
      icon: 'check_circle',
      timeout: 3000,
    })
  } catch (e) {
    console.error(e)
    notif({ type: 'negative', message: 'Error: ' + e.message })
  } finally {
    getChartRefs().forEach((c) => {
      if (c.value) c.value.isPrintMode = false
    })
    pdfLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
/* Fondo Pro */
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
}

.page-title-box {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  padding: 8px 24px;
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
}

/* KPI Cards */
.kpi-card {
  background: rgba(15, 15, 20, 0.85);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-3px);
    background: rgba(20, 20, 25, 0.95);
  }
}

.glass-card {
  background: rgba(15, 15, 20, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}

.border-neon-left {
  border-left: 4px solid #39ff14;
}
.border-cyan-left {
  border-left: 4px solid #00e5ff;
}
.border-white-left {
  border-left: 4px solid #ffffff;
}
.border-blue-left {
  border-left: 4px solid #0037ff;
}

.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.text-glow {
  text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
}
.font-outfit {
  font-family: 'Outfit', sans-serif !important;
}
</style>
