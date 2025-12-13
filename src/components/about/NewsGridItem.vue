<template>
  <div class="news-item cursor-pointer full-height relative-position overflow-hidden bg-dark">
    <q-img
      :src="image"
      class="full-height full-width image-zoom"
      :ratio="1"
      style="background-color: #1a1a1a"
    >
      <template v-slot:error>
        <div class="absolute-full flex flex-center bg-grey-9 column">
          <q-icon name="image_not_supported" size="3em" color="grey-7" />
        </div>
      </template>
    </q-img>

    <div class="absolute-full gradient-overlay"></div>

    <div class="absolute-bottom q-pa-md z-10 content-box">
      <div class="row items-center q-mb-sm">
        <q-badge :color="tagColor" :label="tag" class="q-mr-sm text-weight-bold shadow-2" />
        <span class="text-caption text-grey-4 text-shadow">{{ date }}</span>
      </div>
      <div
        class="text-subtitle1 text-white text-weight-bold leading-tight ellipsis-3-lines text-shadow"
      >
        {{ title }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  image: String,
  title: String,
  date: String,
  tag: String,
  tagColor: { type: String, default: 'primary' },
})
</script>

<style lang="scss" scoped>
.news-item {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
  height: 100%; /* Fundamental para que herede la altura del padre */

  &:hover {
    border-color: var(--q-primary);
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

    .image-zoom {
      transform: scale(1.05);
    }
  }
}

.image-zoom {
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.gradient-overlay {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.6) 50%,
    transparent 100%
  );
  pointer-events: none;
}

.leading-tight {
  line-height: 1.3;
}
.z-10 {
  z-index: 10;
}
.text-shadow {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

/* ESLint fix */
.ellipsis-3-lines {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-clamp: 3;
  overflow: hidden;
}
</style>
