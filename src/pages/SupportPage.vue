<template>
  <q-page padding class="dashboard-pro-bg text-white support-page-layout">
    <div class="relative-position text-center q-mb-md z-10">
      <div class="page-title-box" style="margin-bottom: 0">Centro de Ayuda</div>

      <div class="absolute-right" style="top: 50%; transform: translateY(-50%)">
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" />
      </div>
    </div>

    <div class="row q-col-gutter-lg content-wrapper">
      <div class="col-12 col-md-5 column q-gutter-y-md">
        <q-card flat class="glass-panel q-pa-md text-center">
          <q-icon name="support_agent" size="5em" color="primary" class="q-mb-md" />
          <div class="text-h5 text-weight-bold">¿Necesitas ayuda?</div>
          <p class="text-grey-4 q-mt-sm">
            Usa nuestro chat inteligente para respuestas inmediatas o contacta a un especialista.
          </p>
        </q-card>

        <q-card flat class="glass-panel q-pa-md col-grow column justify-center card-actions">
          <div class="q-gutter-y-md full-width">
            <q-btn
              outline
              color="primary"
              class="full-width q-py-md"
              icon="whatsapp"
              label="Soporte Humano (WhatsApp)"
              href="https://wa.me/5493704022201"
              target="_blank"
            />

            <q-btn
              outline
              color="white"
              class="full-width q-py-md"
              icon="menu_book"
              label="Manual de Usuario"
              to="/about"
            />

            <q-btn
              flat
              color="grey-5"
              class="full-width"
              icon="mail"
              label="Enviar Email"
              href="mailto:soporte@nutrogan.com"
            />
          </div>
        </q-card>
      </div>

      <div class="col-12 col-md-7 column">
        <div class="chatbot-container">
          <SupportChatbot />
        </div>
      </div>
    </div>

    <div class="mobile-footer-spacer lt-md"></div>
  </q-page>
</template>

<script setup>
import SupportChatbot from 'src/components/support/SupportChatbot.vue'
</script>

<style lang="scss" scoped>
/* Fondo Base */
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg4.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
}

.page-title-box {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.glass-panel {
  background: rgba(20, 20, 25, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.z-10 {
  z-index: 10;
}

/* --- RESPONSIVIDAD CRÍTICA --- */

/* 1. MÓVIL (Pantallas pequeñas) */
@media (max-width: 1023px) {
  .support-page-layout {
    /* Convertimos la página en su propio contenedor de scroll */
    width: 100% !important;
    height: 100vh !important; /* Altura fija igual a la ventana */
    overflow-y: auto !important; /* Scroll interno activado */

    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;

    /* Padding superior agresivo para el Header */
    padding-top: 140px !important;
    /* Padding lateral */
    padding-left: 16px !important;
    padding-right: 16px !important;
    /* El padding bottom lo manejamos con el espaciador */
    padding-bottom: 0 !important;
  }

  .chatbot-container {
    height: 500px; /* Altura fija razonable para móvil */
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    margin-top: 20px;
    background: rgba(0, 0, 0, 0.6);
  }

  .card-actions {
    flex: 0 0 auto !important;
  }

  .page-title-box {
    font-size: 1.5rem;
    padding: 8px 16px;
  }

  /* El espaciador "empuja" el final del contenido hacia arriba */
  .mobile-footer-spacer {
    height: 200px; /* Suficiente espacio para librar el footer flotante */
    width: 100%;
    display: block;
  }
}

/* 2. ESCRITORIO (Pantallas grandes) */
@media (min-width: 1024px) {
  .support-page-layout {
    display: flex;
    flex-direction: column;
    /* En escritorio usamos el estilo flotante global, no sobreescribimos height/overflow */
  }

  .content-wrapper {
    flex: 1;
    padding-bottom: 0;
  }

  .chatbot-container {
    height: 100%;
    min-height: 500px;
  }

  .mobile-footer-spacer {
    display: none;
  }
}
</style>
