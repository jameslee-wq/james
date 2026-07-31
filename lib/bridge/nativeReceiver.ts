// lib/bridge/nativeReceiver.ts
'use client'

type Listener = (params: Record<string, unknown>) => void
const listeners = new Map<string, Set<Listener>>()

export function onNative(action: string, cb: Listener): () => void {
    if (!listeners.has(action)) listeners.set(action, new Set())
    listeners.get(action)!.add(cb)
    return () => listeners.get(action)?.delete(cb)
}

export function initNativeReceiver(): void {
    if (typeof window === 'undefined') return
    window.appJsInterface = (json: string) => {
        try {
            const { action, params } = JSON.parse(json)
            listeners.get(action)?.forEach((cb) => cb(params ?? {}))
        } catch (e) {
            console.warn('[bridge] invalid native payload', json, e)
        }
    }
}