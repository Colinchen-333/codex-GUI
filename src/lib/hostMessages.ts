import { eventBus } from './eventBus'

export type HostMessage = {
  type: 'navigate-to-route'
  payload: { path: string }
}

export function dispatchHostMessage(message: HostMessage) {
  if (message.type === 'navigate-to-route') {
    eventBus.emit('host:navigate', { path: message.payload.path })
  }
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { dispatchHostMessage?: typeof dispatchHostMessage }).dispatchHostMessage = dispatchHostMessage
}
