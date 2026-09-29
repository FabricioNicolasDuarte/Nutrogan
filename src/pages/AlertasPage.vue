<template>
  <q-page class="alertas-page text-white font-outfit q-pa-md q-pb-xl">
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" class="q-mr-sm" />
      <div class="col">
        <div class="text-h5 text-weight-bold">Alertas operativas</div>
        <div class="text-caption text-grey-5">
          Activas del establecimiento, historial de envíos y comunicados al equipo
        </div>
      </div>
    </div>

    <div class="alertas-shell q-pa-md">
      <OperationalAlertsPanel variant="page" />
    </div>
  </q-page>
</template>

<script setup>
import OperationalAlertsPanel from 'components/dashboard/OperationalAlertsPanel.vue'
</script>

<style scoped>
.alertas-page {
  max-width: 960px;
  margin: 0 auto;
}
.alertas-shell {
  background: rgba(12, 12, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
