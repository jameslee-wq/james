// lib/bridge/WebAppBridge.ts
'use client'

type BridgeAction =
    | 'goBack' | 'call' | 'loginCompleted' | 'logoutCompleted'
    | 'perPhoto' | 'location' | 'perLocation' | 'openNavi'
    | 'chCarModel' | 'openBrowser' | 'openWindow' | 'closeWindow'
    | 'openPushList' | 'getPushStatus' | 'pushSetting'
    | 'progress' | 'payResult'

interface BridgeMessage {
    action: BridgeAction
    params: Record<string, unknown>
}

// 네이티브 WebView 인터페이스 타입 선언
declare global {
    interface Window {
        android?: { bridge: (message: string) => void }
        webkit?: {
            messageHandlers: { bridge: { postMessage: (message: string) => void } }
        }
        // 네이티브 → 웹 콜백 진입점
        __nativeCallback?: (json: string) => void
    }
}

function isAndroid(): boolean {
    if (typeof navigator === 'undefined') return false
    return /android/i.test(navigator.userAgent)
}

function sendMobile(message: string): void {
    if (typeof window === 'undefined') return
    try {
        if (isAndroid()) {
            window.android?.bridge(message)
        } else {
            window.webkit?.messageHandlers.bridge.postMessage(message)
        }
    } catch (e) {
        console.warn('[bridge] send failed', e)
    }
}

function send(action: BridgeAction, params: Record<string, unknown> = {}): string {
    const message = JSON.stringify({ action, params } satisfies BridgeMessage)
    sendMobile(message)
    return message
}

export const bridge = {
    goBack: () => send('goBack'),
    call: (tel: string) => send('call', { tel }),
    loginCompleted: (memIdx: string, carModel: string, memGrade: string, membership: string) =>
        send('loginCompleted', { memIdx, carModel, memGrade, membership }),
    logoutCompleted: () => send('logoutCompleted'),
    perPhoto: () => send('perPhoto'),
    location: (msg = '위치 정보를 사용할 수 없어 이름순으로 정렬됩니다.') =>
        send('location', { msg }),
    perLocation: () => send('perLocation'),
    openNavi: (type: string, latitude: number, longitude: number, pName: string) =>
        send('openNavi', { type, latitude, longitude, pName }),
    chCarModel: (carModel: string) => send('chCarModel', { carModel }),
    openBrowser: (url: string) => send('openBrowser', { url }),
    openWindow: (url: string) => send('openWindow', { url }),
    closeWindow: () => send('closeWindow'),
    openPushList: () => send('openPushList'),
    getPushStatus: () => send('getPushStatus'),
    pushSetting: (pushType: string, agree: boolean) =>
        send('pushSetting', { pushType, agree }),
    progress: (show: boolean) => send('progress', { show: show ? 'on' : 'off' }),
    payResult: (data: unknown) => send('payResult', { result: data }),
}