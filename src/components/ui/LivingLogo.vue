<template>
  <div class="living-logo-container">
    <div
      class="liquid-shape"
      :style="{
        '-webkit-mask-image': `url(${src})`,
        'mask-image': `url(${src})`,
      }"
    >
      <div class="wave-layer wave-1"></div>
      <div class="wave-layer wave-2"></div>
    </div>

    <img :src="src" class="logo-overlay" />
  </div>
</template>

<script setup>
defineProps({
  src: {
    type: String,
    default: '/images/nutrogan-logo3.svg',
  },
})
</script>

<style scoped>
.living-logo-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.liquid-shape {
  position: absolute;
  inset: 0;
  z-index: 1;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  background-color: #000;
  overflow: hidden;
}

.wave-layer {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0.8;
  mix-blend-mode: screen; /* Mezcla de colores brillante */
}

/* Onda 1: Verde Neón y Azul */
.wave-1 {
  background: linear-gradient(45deg, #39ff14, #0037ff, #39ff14);
  background-size: 200% 200%;
  animation: flow-wave 15s ease-in-out infinite;
}

/* Onda 2: Cyan y Lima (Contraste) */
.wave-2 {
  background: linear-gradient(135deg, transparent, #00ffff, #ccff00, transparent);
  background-size: 200% 200%;
  animation: flow-wave-reverse 20s linear infinite;
}

@keyframes flow-wave {
  0% {
    background-position: 0% 50%;
    transform: scale(1);
  }
  50% {
    background-position: 100% 50%;
    transform: scale(1.1);
  }
  100% {
    background-position: 0% 50%;
    transform: scale(1);
  }
}

@keyframes flow-wave-reverse {
  0% {
    background-position: 100% 50%;
    transform: rotate(0deg);
  }
  100% {
    background-position: 0% 50%;
    transform: rotate(360deg);
  }
}

.logo-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
  opacity: 0.2;
  mix-blend-mode: overlay;
}
</style>
