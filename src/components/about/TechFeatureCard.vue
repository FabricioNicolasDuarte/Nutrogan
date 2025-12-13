<template>
  <div
    class="spotlight-card column"
    ref="cardRef"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="openUrl"
  >
    <div class="spotlight-border" :style="spotlightStyle"></div>

    <div class="card-inner col relative-position bg-dark-glass column">
      <div class="row items-start justify-between q-mb-md">
        <div
          class="icon-box row flex-center"
          :style="{ color: color, borderColor: color, boxShadow: `0 0 15px ${color}20` }"
        >
          <q-icon :name="icon" size="24px" />
        </div>
        <q-icon name="arrow_outward" size="xs" :style="{ color: color }" class="arrow-anim" />
      </div>

      <div class="text-h6 text-weight-bold text-white leading-tight q-mb-xs">{{ title }}</div>
      <div class="text-caption text-grey-5 text-uppercase tracking-wide q-mb-md">
        {{ subtitle }}
      </div>

      <div class="col-grow"></div>

      <p class="text-grey-4 text-body2 description q-mb-none">{{ description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: String,
  subtitle: String,
  description: String,
  icon: String,
  color: { type: String, default: '#39ff14' },
  url: { type: String, default: '' },
})

const cardRef = ref(null)
const mouseX = ref(-100)
const mouseY = ref(-100)
const opacity = ref(0)

function handleMouseMove(e) {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
  opacity.value = 1
}

function handleMouseLeave() {
  opacity.value = 0
}

const spotlightStyle = computed(() => ({
  background: `radial-gradient(600px circle at ${mouseX.value}px ${mouseY.value}px, ${props.color}, transparent 40%)`,
  opacity: opacity.value,
}))

function openUrl() {
  if (props.url) window.open(props.url, '_blank')
}
</script>

<style lang="scss" scoped>
.spotlight-card {
  position: relative;
  height: 100%;
  min-height: 260px; /* Altura mínima asegurada */
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    .arrow-anim {
      transform: translate(2px, -2px);
    }
    .icon-box {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.spotlight-border {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.5s ease;
}

.card-inner {
  position: relative;
  z-index: 1;
  height: 100%;
  margin: 1px;
  border-radius: 15px;
  background: #0d0d0d;
  padding: 24px;
}

.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.tracking-wide {
  letter-spacing: 1.5px;
}
.leading-tight {
  line-height: 1.2;
}
.arrow-anim {
  transition: transform 0.3s;
}

/* FIX ESLINT: line-clamp standard property included */
.description {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  line-clamp: 4; /* Standard property */
  overflow: hidden;
}
</style>
