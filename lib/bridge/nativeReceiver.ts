// lib/bridge/nativeReceiver.ts
// APP → WEB : appJsInterface(json) 수신 및 액션별 분배
'use client'

import type { AppToWebAction, AppToWebPayloadMap } from '@/lib/bridge/WebAppBridge'

type Listener<A extends AppToWebAction> = (params: AppToWebPayloadMap[A]) => void
type AnyListener = (params: Record<string, unknown>) => void

const listeners = new Map<string, Set<AnyListener>>()

/** 모든 수신 메시지를 한 번에 관찰하는 tap (디버깅 / 로그 화면용) */
export interface NativeMessage {
    /** 수신 액션명. JSON 파싱 실패 시 '__parseError' */
    action: string
    params: Record<string, unknown>
    /** 앱이 넘긴 원본 문자열 */
    raw: string
    /** 해당 액션의 구독자가 1명 이상 있었는지 */
    handled: boolean
}

type Tap = (message: NativeMessage) => void
const taps = new Set<Tap>()

/**
 * APP → WEB 으로 들어온 모든 메시지를 구독한다.
 * 구독자가 없는 액션과 파싱 실패 메시지까지 전달된다.
 */
export function onNativeMessage(cb: Tap): () => void {
    taps.add(cb)
    return () => {
        taps.delete(cb)
    }
}

function emitTaps(message: NativeMessage): void {
    taps.forEach((tap) => {
        try {
            tap(message)
        } catch (e) {
            console.warn('[bridge] tap error', message.action, e)
        }
    })
}

/**
 * APP → WEB 액션 구독. 반환된 함수를 호출하면 해제된다.
 * 8.0 goBack, 13.0 pushStatus 는 어떤 페이지에서든 접근 가능해야 하므로
 * 전역 레이아웃에서 구독하는 것을 권장한다.
 */
export function onNative<A extends AppToWebAction>(
    action: A,
    cb: Listener<A>,
): () => void {
    if (!listeners.has(action)) listeners.set(action, new Set())
    const set = listeners.get(action)!
    set.add(cb as AnyListener)
    return () => {
        set.delete(cb as AnyListener)
    }
}

/** 1회성 구독 */
export function onceNative<A extends AppToWebAction>(
    action: A,
    cb: Listener<A>,
): () => void {
    const off = onNative(action, ((params) => {
        off()
        cb(params)
    }) as Listener<A>)
    return off
}

/** 수신 메시지를 구독자에게 전달. 브라우저 단독 테스트에서 직접 호출 가능 */
export function dispatchNative(
    action: string,
    params: Record<string, unknown>,
    raw = JSON.stringify({ action, params }),
): void {
    const set = listeners.get(action)
    const handled = !!set && set.size > 0

    // 액션 구독자보다 먼저 tap 에 흘려 로그 화면이 항상 원본을 받도록 한다.
    emitTaps({ action, params, raw, handled })

    if (!handled) {
        console.warn('[bridge] 구독자 없음:', action, params)
        return
    }
    set!.forEach((cb) => {
        try {
            cb(params)
        } catch (e) {
            console.warn('[bridge] listener error', action, e)
        }
    })
}

let initialized = false

/** window.appJsInterface 등록. 앱 진입 시 1회 호출 */
export function initNativeReceiver(): void {
    if (typeof window === 'undefined' || initialized) return
    initialized = true

    window.appJsInterface = (raw: string) => {
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw)
        try {
            // 앱에서 문자열이 아닌 객체를 그대로 넘기는 경우까지 방어
            const payload: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
            const { action, params } = (payload ?? {}) as {
                action?: string
                params?: Record<string, unknown>
            }
            if (!action) {
                console.warn('[bridge] action 없음', text)
                emitTaps({ action: '__parseError', params: {}, raw: text, handled: false })
                return
            }
            dispatchNative(action, params ?? {}, text)
        } catch (e) {
            console.warn('[bridge] JSON 파싱 실패', text, e)
            emitTaps({ action: '__parseError', params: {}, raw: text, handled: false })
        }
    }
}
