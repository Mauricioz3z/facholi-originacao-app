<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './components/AppLayout.vue'

const route = useRoute()
const auth = useAuthStore()

const showDesktopLayout = computed(() =>
  route.meta.public !== true &&
  auth.isAuthenticated &&
  !route.meta.pwa
)
</script>

<template>
  <AppLayout v-if="showDesktopLayout" />
  <router-view v-else />
</template>
