// lib/bridge/nativeReceiver.ts
'use client'

type Listener = (params: Record<string, unknown>) => void
const listeners = new Map<string, Set<Listener>>()
const wildcardListeners = new Set<(action: string, params: Record<string, unknown>) => void>()

export function onAnyNative(cb: (action: string, params: Record<string, unknown>) => void) {
    wildcardListeners.add(cb)
    return () => wildcardListeners.delete(cb)
}
export function onNative(action: string, cb: Listener): () => void {
    if (!listeners.has(action)) listeners.set(action, new Set())
    listeners.get(action)!.add(cb)
    return () => listeners.get(action)?.delete(cb)
}

// lib/bridge/nativeReceiver.ts
export function initNativeReceiver(): void {
    if (typeof window === 'undefined') return
    window.appJsInterface = (raw: string) => {
        console.log('[bridge] 수신 원본:', raw)   // ← 우선 이거부터 확인
        try {
            const { action, params } = JSON.parse(raw)
            console.log('[bridge] 파싱 결과:', action, params)   // ← 이것도
            listeners.get(action)?.forEach((cb) => cb(params ?? {}))
        } catch (e) {
            console.warn('[bridge] JSON 파싱 실패', raw, e)
        }
    }
}

