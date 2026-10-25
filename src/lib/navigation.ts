import { router } from 'expo-router';

/** Open a page or database; `view` picks a database view. */
export function openPage(id: string, view?: string) {
  router.push({ pathname: '/page/[id]', params: view ? { id, view } : { id } });
}

/** Back to the home screen, like the sidebar button in the reference app. */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Abre un chat; con `agent` (y chat nuevo) empieza hablando con esa agente. */
export function openChat(id: string = 'new', agent?: string) {
  router.push({ pathname: '/chat/[id]', params: agent ? { id, agent } : { id } });
}
