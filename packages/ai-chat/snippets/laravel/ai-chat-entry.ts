import { createChatElement } from './adapters/vanilla/chat-element.js';

function mountChat(element: HTMLElement): void {
  const baseURL = element.dataset.baseUrl;
  const model = element.dataset.model;
  if (!baseURL || !model) return;

  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  const chat = createChatElement({
    apiKey: 'server-proxy',
    baseURL,
    models: [model],
    headers: { 'X-CSRF-TOKEN': csrf },
  });
  const unmount = chat.mount(element);
  window.addEventListener('pagehide', unmount, { once: true });
}

function mountAllChats(): void {
  document.querySelectorAll<HTMLElement>('[data-modularcore-ai-chat]').forEach(mountChat);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAllChats, { once: true });
} else {
  mountAllChats();
}
