<template>
  <q-page class="bg-black text-white flex column no-wrap" style="min-height: 100vh">
    <div class="fixed-full ambient-bg" style="z-index: 0"></div>

    <div class="column full-width relative-position" style="z-index: 1; flex-grow: 1">
      <section class="q-py-xl text-center relative-position q-px-md">
        <div class="hero-glow absolute-center"></div>
        <div class="relative-position z-10">
          <q-badge label="AgriTech" class="pro-badge q-mb-md backdrop-blur" />
          <h1 class="text-display text-white q-my-none text-weight-bolder">
            Gestión Ganadera <br />
            <span class="gradient-text">De Precisión</span>
          </h1>
          <p
            class="text-h6 text-grey-4 q-mt-md q-mx-auto font-light mobile-text"
            style="max-width: 700px"
          >
            El sistema nervioso central de tu establecimiento.
            <br />
            <span class="text-caption text-grey-6 row flex-center justify-center q-mt-sm">
              <q-icon name="verified" class="q-mr-xs text-cyan" /> Validado por CEDEVA
            </span>
          </p>
        </div>
      </section>

      <div
        class="sticky-top z-max q-pb-md flex justify-center full-width q-px-sm"
        style="top: 10px"
      >
        <div class="dock-nav backdrop-blur shadow-10">
          <q-tabs
            v-model="tab"
            class="text-grey-5"
            active-color="cyan-13"
            active-bg-color="white-1"
            indicator-color="cyan-13"
            no-caps
            dense
            mobile-arrows
            outside-arrows
          >
            <q-tab name="vision" label="Visión (ADN)" class="dock-tab" />
            <q-tab name="tech" label="Tecnología" class="dock-tab" />
            <q-tab name="manual" label="Manual" class="dock-tab" />
            <q-tab name="news" label="Mercado" class="dock-tab" />
          </q-tabs>
        </div>
      </div>

      <div class="q-px-md q-pb-xl full-width">
        <q-tab-panels v-model="tab" animated class="bg-transparent text-white panels-container">
          <q-tab-panel name="vision" class="q-pa-none">
            <div class="max-width-1200 q-mx-auto">
              <div class="row q-col-gutter-lg justify-center">
                <div class="col-12 col-md-4">
                  <div
                    class="vision-card bg-dark-surface column flex-center text-center relative-position overflow-hidden q-pa-lg"
                    style="--card-color: #39ff14"
                  >
                    <div class="glow-bg"></div>
                    <div
                      class="content relative-position z-10 column flex-center full-width full-height"
                    >
                      <div class="icon-wrapper q-mb-lg relative-position">
                        <div class="pulsing-circle green"></div>
                        <q-icon name="wifi_off" color="green-13" size="4.5em" />
                      </div>

                      <div class="text-h4 text-weight-bold q-mb-sm title-font">Offline Nativo</div>
                      <p class="text-body1 text-grey-4 leading-relaxed">
                        Base de datos local. Registra sin señal en el monte. Sincronización
                        automática.
                      </p>

                      <div
                        class="q-mt-auto row items-center no-wrap bg-dark-glass q-px-md q-py-xs rounded-borders border-green-dim"
                      >
                        <q-icon name="sync" class="q-mr-sm fa-spin" size="xs" color="green-13" />
                        <span class="text-caption text-green-11 font-mono">AUTO-SYNC: ON</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4">
                  <div
                    class="vision-card bg-dark-surface column flex-center text-center relative-position overflow-hidden q-pa-lg"
                    style="--card-color: #00e5ff"
                  >
                    <div class="glow-bg"></div>
                    <div
                      class="content relative-position z-10 column flex-center full-width full-height"
                    >
                      <div class="icon-wrapper q-mb-lg relative-position">
                        <q-icon name="touch_app" color="cyan-13" size="4.5em" />
                      </div>

                      <div class="text-h4 text-weight-bold q-mb-sm title-font">Mano Enguantada</div>
                      <p class="text-body1 text-grey-4 leading-relaxed">
                        Botones XL y alto contraste. Interfaz diseñada para el trabajo a caballo
                        bajo el sol.
                      </p>

                      <div
                        class="q-mt-auto row items-center no-wrap bg-dark-glass q-px-md q-py-xs rounded-borders border-cyan-dim"
                      >
                        <q-icon name="aspect_ratio" class="q-mr-sm" size="xs" color="cyan-13" />
                        <span class="text-caption text-cyan-11 font-mono">UI: HIGH CONTRAST</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4">
                  <div
                    class="vision-card bg-dark-surface column flex-center text-center relative-position overflow-hidden q-pa-lg"
                    style="--card-color: #2979ff"
                  >
                    <div class="glow-bg"></div>
                    <div
                      class="content relative-position z-10 column flex-center full-width full-height"
                    >
                      <div class="icon-wrapper q-mb-lg relative-position">
                        <q-icon name="trending_up" color="blue-13" size="4.5em" />
                      </div>

                      <div class="text-h4 text-weight-bold q-mb-sm title-font">
                        Rentabilidad Real
                      </div>
                      <p class="text-body1 text-grey-4 leading-relaxed">
                        Transformamos datos en dinero. Detenemos la fuga de valor optimizando
                        costos.
                      </p>

                      <div
                        class="q-mt-auto row items-center no-wrap bg-dark-glass q-px-md q-py-xs rounded-borders border-blue-dim"
                      >
                        <q-icon name="attach_money" class="q-mr-sm" size="xs" color="blue-13" />
                        <span class="text-caption text-blue-11 font-mono">ROI: OPTIMIZED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row justify-center q-mt-xl opacity-60">
                <div class="bg-dark-glass q-px-lg q-py-sm rounded-borders border-cyan text-center">
                  <div class="text-caption text-uppercase text-cyan-3">Proyecto Validado Por</div>
                  <div class="text-h6 text-weight-bold text-cyan-12">CEDEVA</div>
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="tech" class="q-pa-none">
            <div class="max-width-1200 q-mx-auto">
              <div class="column flex-center text-center q-mb-xl">
                <div
                  class="hud-frame relative-position full-width q-mb-lg"
                  style="max-width: 600px"
                >
                  <div
                    class="video-wrapper bg-black relative-position overflow-hidden rounded-borders shadow-10 border-cyan-dim"
                  >
                    <div class="absolute-full flex flex-center z-10 scanning-overlay">
                      <div class="scan-line"></div>
                    </div>
                    <div
                      class="absolute-top-left q-ma-sm z-20 row items-center bg-black-glass q-px-sm rounded-borders"
                    >
                      <div class="pulsing-dot cyan q-mr-sm"></div>
                      <span class="text-caption text-bold font-mono text-cyan-11 text-xs"
                        >LIVE</span
                      >
                    </div>
                    <video
                      src="videos/Video_Escaneo_Corporal_Vaca_Brangus.mp4"
                      class="fit object-cover"
                      autoplay
                      loop
                      muted
                      playsinline
                    ></video>
                  </div>
                </div>
                <div class="q-px-sm">
                  <q-badge
                    color="cyan-10"
                    text-color="white"
                    label="EDGE AI COMPUTING"
                    class="q-mb-sm shadow-5"
                  />
                  <h2 class="text-h4 text-weight-bold q-my-none responsive-title">
                    Visión Artificial
                  </h2>
                  <p class="text-grey-4 text-body1 q-mt-sm">
                    Inferencia biométrica local. Estimación de Condición Corporal (CC) directamente
                    en el dispositivo del usuario, garantizando privacidad y velocidad sin internet.
                  </p>
                </div>
              </div>

              <q-separator dark class="q-my-xl opacity-20" />

              <div class="text-center q-mb-lg">
                <h2 class="text-h4 text-weight-bold q-my-none responsive-title">
                  Stack Tecnológico
                </h2>
                <p class="text-grey-5 q-mt-sm">Arquitectura de Software TFI G.21</p>
              </div>
              <div class="row q-col-gutter-md q-mb-xl">
                <div class="col-12 col-sm-6 col-md-4" v-for="(stack, i) in techStack" :key="i">
                  <TechFeatureCard v-bind="stack" />
                </div>
              </div>

              <div class="row q-col-gutter-md">
                <div
                  class="col-12 col-md-4 cursor-pointer hover-scale"
                  @click="openLink('https://www.sentinel-hub.com/')"
                >
                  <div
                    class="glass-panel q-pa-lg full-height column border-green-dim text-center relative-position"
                  >
                    <div class="row flex-center q-mb-md" style="height: 80px">
                      <q-img
                        src="https://www.sentinel-hub.com/img/logo-sentinel-hub.png"
                        width="90px"
                        fit="contain"
                        class="no-pointer-events"
                      >
                        <template v-slot:error>
                          <div class="row flex-center text-green-13">
                            <q-icon name="satellite_alt" size="3em" />
                          </div>
                        </template>
                      </q-img>
                    </div>

                    <div class="text-h6 text-weight-bold q-mb-sm text-white">Sentinel Hub</div>

                    <p class="text-grey-4 text-body2 q-mb-md text-justify" style="min-height: 60px">
                      Procesamiento de imágenes satelitales multiespectrales. Cálculo histórico de
                      índices verdes (NDVI) y humedad (NDMI).
                    </p>

                    <div class="q-mt-auto full-width">
                      <div class="row justify-center q-gutter-sm q-mb-sm">
                        <q-chip outline color="green-13" size="sm" icon="grass" label="NDVI" />
                        <q-chip outline color="cyan-13" size="sm" icon="water_drop" label="NDMI" />
                      </div>
                      <div
                        class="text-caption text-green-13 font-mono row flex-center justify-center"
                      >
                        VISITAR SITIO <q-icon name="arrow_outward" class="q-ml-xs" />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="col-12 col-md-4 cursor-pointer hover-scale"
                  @click="$router.push('/support')"
                >
                  <div class="glass-panel q-pa-lg full-height column border-cyan-dim text-center">
                    <div class="row flex-center q-mb-md" style="height: 80px">
                      <q-icon name="smart_toy" color="cyan-13" size="4em" />
                    </div>

                    <div class="text-h6 text-weight-bold q-mb-sm text-white">Nutrogan AI</div>

                    <p class="text-grey-4 text-body2 q-mb-md text-justify" style="min-height: 60px">
                      Asistente virtual potenciado por LLMs. Entrenado contextualmente con los datos
                      de tu campo para responder sobre stock y sanidad.
                    </p>

                    <div class="q-mt-auto full-width">
                      <div
                        class="bg-dark-glass q-pa-sm rounded-borders text-center border-cyan-dim"
                      >
                        <div class="text-caption text-cyan-11 text-italic typing-effect">
                          "¿Qué lote tiene menor peso?"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4">
                  <div
                    class="glass-panel q-pa-lg full-height column border-blue-dim text-center relative-position overflow-hidden"
                  >
                    <div class="row flex-center q-mb-md z-10" style="height: 80px">
                      <q-icon name="science" color="blue-12" size="4em" />
                    </div>

                    <div class="text-h6 text-weight-bold q-mb-sm text-white z-10">
                      Rigor Científico
                    </div>

                    <p
                      class="text-grey-4 text-body2 q-mb-md text-justify z-10"
                      style="min-height: 60px"
                    >
                      Motor de cálculo basado en las tablas del
                      <strong>National Research Council (NRC 2016)</strong>. Estimación precisa de
                      GDPV.
                    </p>

                    <div class="q-mt-auto full-width z-10">
                      <q-btn
                        outline
                        color="blue-12"
                        label="Ver Ecuaciones"
                        icon="functions"
                        class="full-width"
                        @click="mathDialog = true"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="manual" class="q-pa-none">
            <div class="max-width-1200 q-mx-auto">
              <div class="text-center q-mb-xl">
                <h2 class="text-h4 text-weight-bold responsive-title">Centro de Entrenamiento</h2>
                <p class="text-cyan-11 mobile-text">Domina la plataforma con guías inmersivas.</p>
              </div>

              <div class="row q-col-gutter-lg justify-center">
                <div
                  class="col-12 col-sm-6 col-md-4"
                  v-for="(guide, index) in guidesList"
                  :key="index"
                >
                  <div class="tutorial-card cursor-pointer" @click="openGuide(guide.id)">
                    <div class="card-glow" :style="`--glow-color: ${guide.color}`"></div>
                    <div class="card-content column items-center text-center q-pa-lg">
                      <div class="icon-orb q-mb-lg" :style="`border-color: ${guide.color}`">
                        <q-icon :name="guide.icon" size="3em" :style="`color: ${guide.color}`" />
                      </div>
                      <div class="text-h6 text-weight-bold q-mb-xs">{{ guide.title }}</div>
                      <p class="text-grey-4 text-body2 q-mb-lg">{{ guide.desc }}</p>
                      <q-btn
                        outline
                        rounded
                        :color="guide.colorName"
                        label="Iniciar Guía"
                        icon-right="play_circle"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="news" class="q-pa-none">
            <div class="max-width-1200 q-mx-auto">
              <div class="text-center q-mb-lg">
                <div class="text-h4 text-weight-bold responsive-title">Mercado e Información</div>
                <div class="text-grey-5 q-mt-sm">Datos actualizados del sector.</div>
              </div>

              <div class="row q-col-gutter-md">
                <div
                  class="col-12 col-sm-6 col-md-3"
                  v-for="(noticia, index) in noticias"
                  :key="index"
                >
                  <div style="height: 400px">
                    <NewsGridItem v-bind="noticia" />
                  </div>
                </div>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </div>

      <footer class="q-py-xl text-center text-grey-7 border-top-subtle q-mt-auto">
        <div class="text-caption text-uppercase tracking-widest q-mb-xs text-cyan-14">
          Nutrogan Technologies
        </div>
        <div class="text-caption text-grey-8 text-xs">v2.4.0 • Formosa, Argentina</div>
      </footer>
    </div>

    <q-dialog v-model="guideDialog" :maximized="$q.screen.lt.sm" backdrop-filter="blur(10px)">
      <q-card
        class="bg-black border-thin text-white guide-modal"
        style="width: 700px; max-width: 95vw; border-color: var(--guide-color)"
      >
        <q-card-section class="row items-center q-pb-none" :style="{ color: currentGuide.color }">
          <div class="text-subtitle1 text-weight-bold row items-center">
            <q-icon :name="currentGuide.icon" class="q-mr-sm" /> {{ currentGuide.title }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="col flex flex-center">
          <q-carousel
            v-model="guideSlide"
            transition-prev="slide-right"
            transition-next="slide-left"
            swipeable
            animated
            control-color="white"
            arrows
            navigation
            height="300px"
            class="bg-transparent full-width"
          >
            <q-carousel-slide
              v-for="(step, index) in currentGuide.steps"
              :key="index"
              :name="index"
              class="column flex-center text-center q-pa-md"
            >
              <q-icon
                :name="step.icon"
                size="5em"
                :style="{ color: currentGuide.color }"
                class="q-mb-md"
              />
              <div class="text-h6 q-mb-md">{{ step.title }}</div>
              <div class="text-body2 text-grey-4">{{ step.desc }}</div>
              <q-btn
                v-if="index === currentGuide.steps.length - 1"
                :label="step.actionLabel"
                outline
                class="q-mt-xl"
                :style="{ color: currentGuide.color }"
                :to="step.actionRoute"
                v-close-popup
              />
            </q-carousel-slide>
          </q-carousel>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="mathDialog" position="bottom">
      <q-card
        class="bg-dark-surface border-blue-dim text-white full-width"
        style="border-top: 3px solid #2979ff"
      >
        <q-card-section class="row items-center">
          <div class="text-subtitle1 text-blue-12 text-weight-bold">
            <q-icon name="science" class="q-mr-sm" /> Ecuaciones NRC (2016)
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="text-center q-pt-none">
          <p class="text-caption text-grey-4 q-mb-md">
            Nutrogan utiliza las ecuaciones del
            <strong>National Research Council (2016)</strong> para determinar requerimientos
            nutricionales y rendimiento.
          </p>

          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <div class="bg-black q-pa-sm rounded-borders border-thin">
                <div class="text-caption text-blue-11 q-mb-xs font-mono text-uppercase">
                  1. Ganancia Diaria (GDPV)
                </div>
                <div class="text-h6 text-white font-mono">GDPV = (Pf - Pi) / Δt</div>
              </div>
            </div>

            <div class="col-12 col-sm-6">
              <div class="bg-black q-pa-sm rounded-borders border-thin full-height">
                <div class="text-caption text-cyan-11 q-mb-xs font-mono text-uppercase">
                  2. Consumo (CMS)
                </div>
                <div class="text-subtitle1 text-white font-mono">CMS = PV * %PV</div>
                <div class="text-caption text-grey-6 text-xs">
                  %PV varía por categoría (2% - 3%)
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6">
              <div class="bg-black q-pa-sm rounded-borders border-thin full-height">
                <div class="text-caption text-green-11 q-mb-xs font-mono text-uppercase">
                  3. Conversión (CA)
                </div>
                <div class="text-subtitle1 text-white font-mono">CA = CMS / GDPV</div>
                <div class="text-caption text-grey-6 text-xs">Kg alimento para 1kg carne</div>
              </div>
            </div>
          </div>

          <div class="q-mt-md text-caption text-grey-6 text-italic">
            * PV: Peso Vivo Actual | * Pf: Peso Final | * Pi: Peso Inicial
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import TechFeatureCard from 'components/about/TechFeatureCard.vue'
import NewsGridItem from 'components/about/NewsGridItem.vue'


const tab = ref('vision')
const mathDialog = ref(false)
const guideDialog = ref(false)
const guideSlide = ref(0)
const currentGuide = ref({ title: '', color: '#fff', steps: [] })

const openLink = (url) => {
  window.open(url, '_blank')
}

// STACK TECNOLÓGICO CON ICONOS SVG REALES
const techStack = [
  {
    title: 'Supabase',
    subtitle: 'BaaS & Postgres',
    description:
      'Base de datos relacional PostgreSQL con cumplimiento ACID y seguridad RLS. Esencial para la sincronización offline y manejo de datos complejos.',
    icon: 'img:https://cdn.simpleicons.org/supabase/3ecf8e',
    color: '#3ecf8e',
    url: 'https://supabase.com/',
  },
  {
    title: 'Quasar',
    subtitle: 'Frontend Framework',
    description:
      'Framework Vue.js de alto rendimiento. Permite compilar una PWA instalable con Service Workers nativos, crucial para la operatividad en el monte.',
    icon: 'img:https://cdn.quasar.dev/logo-v2/svg/logo.svg',
    color: '#00e5ff',
    url: 'https://quasar.dev/',
  },
  {
    title: 'TensorFlow',
    subtitle: 'Edge AI',
    description:
      'Ejecución de modelos ML en el navegador. Garantiza privacidad y análisis biométrico instantáneo sin depender de la nube.',
    icon: 'img:https://cdn.simpleicons.org/tensorflow/ff6f00',
    color: '#ff6f00',
    url: 'https://www.tensorflow.org/',
  },
  {
    title: 'Leaflet',
    subtitle: 'GIS & Mapas',
    description:
      'Motor de mapas ligero. Renderiza capas GeoJSON y permite la interacción táctil fluida con potreros sobre cartografía satelital.',
    icon: 'img:https://cdn.simpleicons.org/leaflet/b0ff57',
    color: '#b0ff57',
    url: 'https://leafletjs.com/',
  },
  {
    title: 'Docker',
    subtitle: 'Infraestructura',
    description:
      'Estandarización de entornos mediante contenedores. Asegura paridad absoluta entre desarrollo y producción con builds multi-stage.',
    icon: 'img:https://cdn.simpleicons.org/docker/2496ed',
    color: '#2979ff',
    url: 'https://www.docker.com/',
  },
  {
    title: 'Cypress',
    subtitle: 'Quality Assurance',
    description:
      'Suite de pruebas E2E automatizadas. Valida flujos críticos como Login y Sync para garantizar la robustez del sistema en producción.',
    icon: 'img:https://cdn.simpleicons.org/cypress/1de9b6',
    color: '#1de9b6',
    url: 'https://www.cypress.io/',
  },
]

const guidesList = [
  {
    id: 'crear_lotes',
    title: 'Operativa',
    desc: 'Gestión de Lotes',
    icon: 'fence',
    color: '#39ff14',
    colorName: 'green-13',
  },
  {
    id: 'agua',
    title: 'Recursos',
    desc: 'Análisis de Agua',
    icon: 'water_drop',
    color: '#00ffff',
    colorName: 'cyan-13',
  },
  {
    id: 'reportes',
    title: 'Finanzas',
    desc: 'Costos y IA',
    icon: 'attach_money',
    color: '#2979ff',
    colorName: 'blue-13',
  },
]

const guidesDatabase = {
  crear_lotes: {
    title: 'Crear Lotes',
    color: '#39ff14',
    icon: 'fence',
    steps: [
      { title: 'Ir a Lotes', desc: 'Menú inferior.', icon: 'fence' },
      { title: 'Nuevo (+)', desc: 'Botón verde.', icon: 'add' },
      {
        title: 'Datos',
        desc: 'Carga cantidad.',
        icon: 'edit_note',
        action: true,
        actionLabel: 'Ir',
        actionRoute: '/lotes',
      },
    ],
  },
  agua: {
    title: 'Agua',
    color: '#00ffff',
    icon: 'water_drop',
    steps: [
      { title: 'Recursos', desc: 'Ve a Recursos.', icon: 'category' },
      {
        title: 'Cargar',
        desc: 'Ingresa pH.',
        icon: 'science',
        action: true,
        actionLabel: 'Ir',
        actionRoute: '/recursos/agua',
      },
    ],
  },
  reportes: {
    title: 'Reportes',
    color: '#2979ff',
    icon: 'psychology',
    steps: [
      { title: 'Reportes', desc: 'Módulo Reportes.', icon: 'bar_chart' },
      {
        title: 'IA',
        desc: 'Pedir análisis.',
        icon: 'auto_awesome',
        action: true,
        actionLabel: 'Ir',
        actionRoute: '/reportes',
      },
    ],
  },
}

const noticias = ref([
  {
    title: 'Precios Liniers',
    date: 'Hoy',
    tag: 'MERCADO',
    tagColor: 'green-6',
    image:
      'https://images.unsplash.com/photo-1545464508-3563458925cb?auto=format&fit=crop&q=80&w=400',
  },
  {
    title: 'Alerta Sequía',
    date: '10 Dic',
    tag: 'CLIMA',
    tagColor: 'orange-8',
    image:
      'https://images.unsplash.com/photo-1504386106331-3e4e71712b38?auto=format&fit=crop&q=80&w=400',
  },
  {
    title: 'CEDEVA Info',
    date: '05 Dic',
    tag: 'INSTITUCIONAL',
    tagColor: 'blue-6',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400',
  },
  {
    title: 'Vacunación',
    date: '01 Dic',
    tag: 'SANIDAD',
    tagColor: 'red-5',
    image:
      'https://images.unsplash.com/photo-1596733430282-7438b9319692?auto=format&fit=crop&q=80&w=400',
  },
])

function openGuide(key) {
  if (guidesDatabase[key]) {
    currentGuide.value = guidesDatabase[key]
    guideSlide.value = 0
    guideDialog.value = true
    document.documentElement.style.setProperty('--guide-color', currentGuide.value.color)
  }
}
</script>

<style lang="scss" scoped>
/* FONDOS */
.ambient-bg {
  background: #050505 radial-gradient(circle at 50% 10%, rgba(57, 255, 20, 0.05), transparent 50%);
}
.hero-glow {
  width: 500px;
  height: 300px;
  background: rgba(57, 255, 20, 0.1);
  filter: blur(90px);
  max-width: 100%;
}

/* TYPOGRAPHY */
.text-display {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  line-height: 1.1;
  letter-spacing: -1px;
}
.responsive-title {
  font-size: clamp(1.5rem, 4vw, 2.125rem);
  line-height: 1.2;
}
.mobile-text {
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
}
.text-xs {
  font-size: 0.75rem;
}

.gradient-text {
  background: linear-gradient(90deg, #39ff14 0%, #00ffff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.pro-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #39ff14;
  letter-spacing: 2px;
}

/* NAV */
.dock-nav {
  background: rgba(20, 20, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  max-width: 100%;
  overflow-x: auto;
}
.dock-tab {
  min-width: auto;
  padding: 0 12px;
  font-size: 0.9rem;
}
.sticky-top {
  position: sticky;
  top: 15px;
}

/* TARJETAS BENTO */
.vision-card {
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: default;
  min-height: 320px;

  /* Aspect Ratio cuadrado solo en Desktop */
  @media (min-width: 1024px) {
    aspect-ratio: 1/1;
  }
}

.vision-card:hover {
  transform: translateY(-8px);
  border-color: var(--card-color);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  .glow-bg {
    opacity: 0.2;
  }
  .icon-wrapper q-icon {
    transform: scale(1.1);
    color: var(--card-color) !important;
  }
}

.glow-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, var(--card-color), transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.icon-wrapper {
  transition: transform 0.3s;
}
.title-font {
  letter-spacing: -0.5px;
}

/* ANIMACIONES */
.signal-anim-container {
  position: relative;
}
.signal-icon {
  color: #f44336;
  animation: signal-blink 3s infinite;
}
.sync-spin {
  animation: spin 2s linear infinite;
}
.fade-text {
  animation: fade-in-out 3s infinite;
}
.pulsing-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid;
  opacity: 0;
  animation: expand-fade 2s infinite;
}
.pulsing-circle.green {
  border-color: #39ff14;
}

/* BORDERS & GLOWS */
.primary-glow {
  background: radial-gradient(circle, #39ff14 0%, transparent 60%);
}
.blue-glow {
  background: radial-gradient(circle, #2979ff 0%, transparent 60%);
}
.border-cyan {
  border: 1px solid rgba(0, 255, 255, 0.3);
}
.border-cyan-dim {
  border: 1px solid rgba(0, 255, 255, 0.15);
}
.border-green-dim {
  border: 1px solid rgba(57, 255, 20, 0.15);
}
.border-blue-dim {
  border: 1px solid rgba(41, 121, 255, 0.15);
}
.border-thin {
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* VIDEO & MANUAL */
.hud-frame {
  padding: 10px;
  position: relative;
  width: 100%;
}
.video-wrapper {
  aspect-ratio: 16/9;
  width: 100%;
}
.object-cover {
  object-fit: cover;
}
.tutorial-card {
  position: relative;
  height: 350px;
  border-radius: 24px;
  background: #0d0d0d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
  width: 100%;
}
.tutorial-card:hover {
  transform: translateY(-5px);
  border-color: var(--card-highlight);
}
.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, var(--glow-color), transparent 60%);
  opacity: 0.1;
}
.icon-orb {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
}
.hover-scale {
  transition: transform 0.2s;
}
.hover-scale:hover {
  transform: scale(1.02);
}

/* UTILS */
.max-width-1200 {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.max-width-800 {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
.bg-dark-glass {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}
.glass-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  backdrop-filter: blur(5px);
}
.bg-dark-surface {
  background: #0a0a0a;
}
.pulsing-dot {
  width: 8px;
  height: 8px;
  background: red;
  border-radius: 50%;
  animation: blink 1s infinite;
}
.pulsing-dot.cyan {
  background: #00e5ff;
  box-shadow: 0 0 10px #00e5ff;
}

/* MEDIA QUERIES */
@media (max-width: 599px) {
  .text-center-xs {
    text-align: center;
  }
  .justify-center-xs {
    justify-content: center;
  }
}
@media (min-width: 600px) {
  .text-left-sm {
    text-align: left;
  }
  .justify-start-sm {
    justify-content: flex-start;
  }
}

@keyframes scan {
  0% {
    transform: translateY(-100px);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100px);
    opacity: 0;
  }
}
@keyframes blink {
  50% {
    opacity: 0.4;
  }
}
@keyframes signal-blink {
  0%,
  40% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0.3;
  }
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
@keyframes expand-fade {
  0% {
    width: 60px;
    height: 60px;
    opacity: 0.8;
  }
  100% {
    width: 140px;
    height: 140px;
    opacity: 0;
  }
}
</style>
