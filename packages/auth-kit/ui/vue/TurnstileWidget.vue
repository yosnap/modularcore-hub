<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';

const props = defineProps<{
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  mode?: 'managed' | 'non-interactive' | 'invisible';
}>();
const emit = defineEmits<{ token: [token: string | null] }>();

const container = ref<HTMLDivElement | null>(null);
const controller = new TurnstileController({
  siteKey: props.siteKey,
  theme: props.theme,
  mode: props.mode,
});
let unmountWidget: (() => void) | undefined;

const unsubscribe = controller.subscribe((state) => emit('token', state.token));

onMounted(() => {
  if (container.value) unmountWidget = mountTurnstileWidget(container.value, controller);
});

onBeforeUnmount(() => {
  unsubscribe();
  unmountWidget?.();
});
</script>

<template>
  <div v-if="siteKey" ref="container"></div>
</template>
