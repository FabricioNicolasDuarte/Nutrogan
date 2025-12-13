<template>
  <q-page padding class="page-container-bg">
    <div class="text-center q-mb-lg">
      <div class="page-title-box">Gestión de Recursos</div>
      <div class="text-grey-4 text-subtitle1 q-mt-xs">Inventario y Activos del Establecimiento</div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="recurso in recursosEnriquecidos" :key="recurso.titulo" class="col-12 col-md-6">
        <q-card
          class="resource-card cursor-pointer relative-position overflow-hidden"
          v-ripple
          @click="$router.push(recurso.link)"
        >
          <q-img :src="recurso.image" class="absolute-full card-bg-img">
            <template v-slot:error>
              <div class="absolute-full flex flex-center bg-grey-9">
                <q-icon name="image_not_supported" color="grey-7" size="3em" />
              </div>
            </template>
          </q-img>

          <div class="absolute-full gradient-overlay"></div>

          <div class="absolute-top-right q-pa-md">
            <q-badge
              v-if="recurso.alertCount > 0"
              color="red"
              text-color="white"
              class="q-mr-sm shadow-3 animate-pulse"
            >
              <q-icon name="warning" class="q-mr-xs" />
              {{ recurso.alertLabel }}
            </q-badge>
            <q-badge color="dark" text-color="primary" class="shadow-3 text-weight-bold font-mono">
              {{ recurso.statPrincipal }}
            </q-badge>
          </div>

          <div class="absolute-bottom q-pa-md content-box">
            <div class="row items-center justify-between">
              <div>
                <div class="text-h5 text-weight-bold text-white text-shadow">
                  {{ recurso.titulo }}
                </div>
                <div class="text-subtitle2 text-grey-3 text-shadow ellipsis-2-lines">
                  {{ recurso.caption }}
                </div>
              </div>
              <q-icon name="chevron_right" color="primary" size="2em" class="arrow-icon" />
            </div>

            <div class="mini-stats row q-mt-sm q-gutter-x-md text-caption text-grey-4">
              <span v-for="(stat, idx) in recurso.subStats" :key="idx" class="row items-center">
                <q-icon :name="stat.icon" size="xs" class="q-mr-xs" :color="stat.color" />
                {{ stat.text }}
              </span>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'

const dataStore = useDataStore()

onMounted(() => {
  // Cargamos datos frescos para que las tarjetas muestren info real
  dataStore.fetchAll()
})

const recursosEnriquecidos = computed(() => {
  // 1. Potreros Stats
  const totalHa = dataStore.potreros.reduce((acc, p) => acc + (p.superficie_ha || 0), 0).toFixed(0)
  const potrerosOcupados = dataStore.lotes.filter((l) => l.potrero_actual_id).length // Aprox

  // 2. Despensa Stats
  const itemsCriticos = dataStore.inventarioItems.filter(
    (i) => i.stock_actual <= i.stock_minimo_alerta,
  ).length
  const valorTotal = dataStore.inventarioItems.reduce(
    (acc, i) => acc + (i.stock_actual * i.precio_unitario || 0),
    0,
  )

  // 3. Agua Stats
  const fuentesMalas = dataStore.fuentesAgua.filter(
    (f) => f.ultimo_estado === 'Peligro' || f.ultimo_estado === 'Precaución',
  ).length

  // 4. Lluvias Stats
  const hoy = new Date()
  const lluviasMes = dataStore.registrosLluvia
    .filter((r) => {
      const d = new Date(r.fecha)
      return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
    })
    .reduce((acc, r) => acc + r.milimetros, 0)

  // 5. Satelital Stats
  const conDatosSatelitales = dataStore.potreros.filter(
    (p) => typeof p.ultimo_ndvi === 'number',
  ).length

  return [
    {
      titulo: 'Mis Potreros',
      caption: 'Gestión de parcelas y superficie.',
      link: '/recursos/potreros',
      image: 'images/recursos/potreros.jpg',
      statPrincipal: `${totalHa} HA TOTALES`,
      alertCount: 0,
      subStats: [
        { icon: 'grid_view', text: `${dataStore.potreros.length} Lotes`, color: 'white' },
        { icon: 'pets', text: `${potrerosOcupados} Ocupados`, color: 'white' },
      ],
    },
    {
      titulo: 'Mi Despensa',
      caption: 'Insumos, alimentos y costos.',
      link: '/recursos/despensa',
      image: 'images/recursos/despensa.jpg',
      statPrincipal: `$${valorTotal.toLocaleString('es-AR')}`,
      alertCount: itemsCriticos,
      alertLabel: `${itemsCriticos} REPOSICIÓN`,
      subStats: [
        { icon: 'inventory_2', text: `${dataStore.inventarioItems.length} Items`, color: 'white' },
      ],
    },
    {
      titulo: 'Fuentes de Agua',
      caption: 'Aguadas y calidad del agua.',
      link: '/recursos/agua',
      image: 'images/recursos/agua.jpg',
      statPrincipal: `${dataStore.fuentesAgua.length} PUNTOS`,
      alertCount: fuentesMalas,
      alertLabel: 'CALIDAD BAJA',
      subStats: [{ icon: 'science', text: 'Monitoreo activo', color: 'cyan-4' }],
    },
    {
      titulo: 'Central de Clima',
      caption: 'Precipitaciones y pronóstico.',
      link: '/recursos/lluvias',
      image: 'images/recursos/lluvias.jpg',
      statPrincipal: `${lluviasMes}mm (MES)`,
      alertCount: 0,
      subStats: [
        { icon: 'calendar_month', text: 'Registro histórico', color: 'white' },
        { icon: 'thermostat', text: 'Pronóstico 5 días', color: 'orange-4' },
      ],
    },
    {
      titulo: 'Satélite (NDVI)',
      caption: 'Índices de vigor vegetal.',
      link: '/recursos/satelital',
      image: 'images/recursos/satelital.jpg',
      statPrincipal: 'SENTINEL-2',
      alertCount: 0,
      subStats: [
        {
          icon: 'satellite_alt',
          text: `${conDatosSatelitales} Lotes monitoreados`,
          color: 'green-13',
        },
      ],
    },
  ]
})
</script>

<style lang="scss" scoped>
.page-container-bg {
  /* Usamos el mismo fondo que el dashboard para consistencia visual */
  background: transparent;
}

.page-title-box {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  padding: 8px 24px;
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 700;
}

.resource-card {
  height: 200px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: #000;

  &:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
    border-color: #39ff14;

    .card-bg-img {
      transform: scale(1.1);
    }
    .arrow-icon {
      transform: translateX(5px);
    }
  }
}

.card-bg-img {
  transition: transform 0.5s ease;
  filter: brightness(0.8);
}

/* Gradiente para que el texto blanco se lea perfecto sobre cualquier foto */
.gradient-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.5) 40%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

.text-shadow {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.font-mono {
  font-family: 'Fira Code', monospace;
}

.arrow-icon {
  transition: transform 0.3s;
}

.animate-pulse {
  animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}
</style>
