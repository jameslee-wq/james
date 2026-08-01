// hooks/useNativeEvent.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { onNative } from '@/lib/bridge/nativeReceiver'
import { bridge } from '@/lib/bridge/WebAppBridge'
import type { AppToWebAction, AppToWebPayloadMap } from '@/lib/bridge/WebAppBridge'

/**
 * APP → WEB 액션의 최신 수신값을 상태로 보관한다.
 * 예) const scan = useNativeEvent('scanResult') // { value: '919191919' }
 */
export function useNativeEvent<A extends AppToWebAction>(
    action: A,
): AppToWebPayloadMap[A] | null {
    const [data, setData] = useState<AppToWebPayloadMap[A] | null>(null)

    useEffect(() => onNative(action, setData), [action])

    return data
}

/**
 * APP → WEB 액션을 콜백으로 처리한다.
 * 콜백은 ref 로 보관하므로 매 렌더마다 재구독되지 않는다.
 */
export function useNativeListener<A extends AppToWebAction>(
    action: A,
    handler: (params: AppToWebPayloadMap[A]) => void,
): void {
    const saved = useRef(handler)
    useEffect(() => {
        saved.current = handler
    })

    useEffect(() => onNative(action, (params) => saved.current(params)), [action])
}

/**
 * 8.0 안드로이드 백 버튼 대응.
 * 앱이 goBack 을 호출하면 handler 를 실행하고,
 * handler 가 false 를 반환하면(더 이상 닫을 레이어/페이지 없음) 앱으로 goBack 을 되돌려 준다.
 */
export function useAndroidBackButton(handler: () => boolean | void): void {
    const saved = useRef(handler)
    useEffect(() => {
        saved.current = handler
    })

    useEffect(
        () =>
            onNative('goBack', () => {
                if (saved.current() !== true) bridge.goBack()
            }),
        [],
    )
}

/**
 * 요청 → 결과 수신을 Promise 로 묶는다.
 * 예) const scan = useNativeRequest('scanResult', bridge.openScanner)
 *     const { value } = await scan()
 */
export function useNativeRequest<A extends AppToWebAction>(
    action: A,
    request: () => void,
    timeoutMs = 30_000,
): () => Promise<AppToWebPayloadMap[A]> {
    const savedRequest = useRef(request)
    useEffect(() => {
        savedRequest.current = request
    })

    return useCallback(
        () =>
            new Promise<AppToWebPayloadMap[A]>((resolve, reject) => {
                const timer = setTimeout(() => {
                    off()
                    reject(new Error(`[bridge] ${action} 응답 없음 (${timeoutMs}ms)`))
                }, timeoutMs)

                const off = onNative(action, (params) => {
                    clearTimeout(timer)
                    off()
                    resolve(params)
                })

                savedRequest.current()
            }),
        [action, timeoutMs],
    )
}
