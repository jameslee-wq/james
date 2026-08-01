// lib/bridge/WebAppBridge.ts
// 레드버튼 웹-앱 연동문서 [WebView 연동] 탭 기준
'use client'

/* ------------------------------------------------------------------
 * 연동 프로토콜
 *   Android : 함수명 bridge
 *   iOS     : 핸들러 bridge
 *   APP→WEB : appJsInterface(json)
 * ------------------------------------------------------------------ */

/** WEB → APP (Bridge 연동) 액션 */
export type WebToAppAction =
    | 'loginCompleted'      // 1.0  로그인
    | 'logoutCompleted'     // 2.0  로그아웃
    | 'login'               // 3.0  소셜 로그인 요청
    | 'openScanner'         // 4.0  바코드 / QR 카메라 열기
    | 'openPushList'        // 5.0  알림함 열기
    | 'openContact'         // 6.0  연락처 열기
    | 'share'               // 7.0  시스템 공유창 열기
    | 'goBack'              // 8.0  안드로이드 백 버튼 (더 이상 뒤로갈 곳 없을 때)
    | 'openBrowser'         // 9.0  외부 브라우저 열기
    | 'progress'            // 10.0 프로그래스바 노출 / 숨김
    | 'location'            // 11.0 위치 정보 요청
    | 'closeOpenWindow'     // 12.0 OPEN WINDOW 닫기
    | 'getPushStatus'       // 13.0 알림함 N 표시 갱신 요청
    | 'permission'          // 14.0 권한체크
    | 'adPushAgree'         // 15.0 마케팅 동의여부

/** APP → WEB (JS 함수 연동) 액션 */
export type AppToWebAction =
    | 'logout'              // 2.0
    | 'loginResult'         // 3.0
    | 'scanResult'          // 4.0
    | 'contactResult'       // 6.0
    | 'goBack'              // 8.0
    | 'locationResult'      // 11.0
    | 'pushStatus'          // 13.0
    | 'permissionResult'    // 14.0
    | 'adPushAgreeResult'   // 15.0

export interface BridgeMessage<A extends string = WebToAppAction> {
    action: A
    params: Record<string, unknown>
}

/* ----------------------------- 공통 값 ----------------------------- */

/** 3.0 소셜 로그인 - snsChannel */
export type SnsChannel = 'naver' | 'kakao' | 'apple'

/** 3.0 소셜 로그인 - fnType (앱은 그대로 ByPass) */
export type SnsFnType = 'login' | 'info' | 'withdrawal'

/** 14.0 권한체크 - type */
export type PermissionType = 'camera' | 'galleryCa'

export type OnOff = 'on' | 'off'
export type YN = 'y' | 'n'
export type SuccessFail = 'success' | 'fail'

/* --------------------- APP → WEB params 타입 --------------------- */

/** 2.0 logout */
export type LogoutParams = Record<string, never>

/** 3.0 loginResult */
export interface LoginResultParams {
    result: SuccessFail
    snsChannel: SnsChannel
    snsId: string
    /** 네이버/카카오를 통해 받은 CI 값 */
    ci: string
    /** 카카오(카카오싱크)만 값 전달, 그 외는 빈 값 */
    email: string
    /** 요청 때 보낸 값을 그대로 전달 */
    fnType: SnsFnType
    /** 카카오싱크만 값 전달, 그 외는 빈 값 */
    serviceAgreeYn?: string
}

/** 4.0 scanResult */
export interface ScanResultParams {
    /** QR 또는 Barcode 스캔 결과값 */
    value: string
}

/** 6.0 contactResult - 1명이라도 Array 형태로 내려옴 */
export interface ContactItem {
    name: string
    phone: string
}
export interface ContactResultParams {
    list: ContactItem[]
}

/** 8.0 goBack */
export type GoBackParams = Record<string, never>

/** 11.0 locationResult - 취소/거부/실패 시 "0","0" */
export interface LocationResultParams {
    latitude: string
    longitude: string
}

/** 13.0 pushStatus */
export interface PushStatusParams {
    new: YN
}

/** 14.0 permissionResult */
export interface PermissionResultParams {
    result: SuccessFail
}

/** 15.0 adPushAgreeResult */
export interface AdPushAgreeResultParams {
    result: SuccessFail
}

/** APP → WEB 액션 ↔ params 매핑 */
export interface AppToWebPayloadMap {
    logout: LogoutParams
    loginResult: LoginResultParams
    scanResult: ScanResultParams
    contactResult: ContactResultParams
    goBack: GoBackParams
    locationResult: LocationResultParams
    pushStatus: PushStatusParams
    permissionResult: PermissionResultParams
    adPushAgreeResult: AdPushAgreeResultParams
}

/* --------------------------- 전역 선언 --------------------------- */

declare global {
    interface Window {
        /** Android JavascriptInterface (함수명: bridge) */
        android?: { bridge: (message: string) => void }
        /** Android JavascriptInterface 가 최상위로 주입된 경우 */
        bridge?: (message: string) => void
        /** iOS WKScriptMessageHandler (핸들러: bridge) */
        webkit?: {
            messageHandlers?: { bridge?: { postMessage: (message: string) => void } }
        }
        /** APP → WEB 진입점 */
        appJsInterface?: (json: string) => void
    }
}

/* ----------------------- 커스텀 Agent 파싱 ----------------------- */
/** redbutton(os구분,앱버전,UUID,디바이스모델) */
export interface RedButtonAgent {
    os: string
    appVersion: string
    uuid: string
    deviceModel: string
}

const AGENT_RE = /redbutton\(([^)]*)\)/i

/** UserAgent 에서 redbutton(...) 정보를 파싱. 앱이 아니면 null */
export function getAppAgent(ua?: string): RedButtonAgent | null {
    const agent = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
    const matched = AGENT_RE.exec(agent)
    if (!matched) return null

    const [os = '', appVersion = '', uuid = '', deviceModel = ''] = matched[1]
        .split(',')
        .map((v) => v.trim())

    return { os, appVersion, uuid, deviceModel }
}

/** 앱 WebView 내에서 실행 중인지 여부 */
export function isApp(): boolean {
    return getAppAgent() !== null
}

/** 커스텀 Agent 의 os 구분값 우선, 없으면 UserAgent 로 판별 */
export function isAndroid(): boolean {
    const agent = getAppAgent()
    if (agent?.os) return /android|aos/i.test(agent.os)
    if (typeof navigator === 'undefined') return false
    return /android/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
    const agent = getAppAgent()
    if (agent?.os) return /ios|iphone|ipad/i.test(agent.os)
    if (typeof navigator === 'undefined') return false
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/* ---------------------------- 송신부 ---------------------------- */

function post(message: string): void {
    if (typeof window === 'undefined') return
    try {
        if (isAndroid()) {
            if (window.android?.bridge) window.android.bridge(message)
            else if (window.bridge) window.bridge(message)
            else console.warn('[bridge] android interface 없음', message)
            return
        }
        const handler = window.webkit?.messageHandlers?.bridge
        if (handler) handler.postMessage(message)
        else console.warn('[bridge] ios handler 없음', message)
    } catch (e) {
        console.warn('[bridge] send failed', message, e)
    }
}

/* ----------------------- 송신 인터셉터 (확인창) ----------------------- */

/** Bridge 로 나갈 메시지 */
export interface OutgoingBridge {
    kind: 'bridge'
    action: WebToAppAction
    params: Record<string, unknown>
    /** 실제로 전송될 JSON 문자열 */
    message: string
}

/** Scheme 으로 나갈 요청 (16.0) */
export interface OutgoingScheme {
    kind: 'scheme'
    type: string
    url?: string
    /** 실제로 이동할 Full Scheme URL */
    target: string
}

export type OutgoingRequest = OutgoingBridge | OutgoingScheme

/** `false` 를 반환하면 전송을 보류한다(확인창에서 사용) */
export type OutgoingInterceptor = (req: OutgoingRequest) => boolean | void

let interceptor: OutgoingInterceptor | null = null

/** 송신 직전 가로채기. null 을 넘기면 해제 */
export function setOutgoingInterceptor(fn: OutgoingInterceptor | null): void {
    interceptor = fn
}

/** 인터셉터를 우회해 실제로 앱에 전달한다(확인창의 "전송" 처리용) */
export function dispatchOutgoing(req: OutgoingRequest): void {
    if (req.kind === 'bridge') {
        post(req.message)
        return
    }
    if (typeof window !== 'undefined') window.location.href = req.target
}

function request(req: OutgoingRequest): boolean {
    if (interceptor && interceptor(req) === false) return false
    dispatchOutgoing(req)
    return true
}

/**
 * WEB → APP 전송. 전송(예정)한 JSON 문자열을 반환(로깅/테스트용).
 * 인터셉터가 보류시키면 전송하지 않고 문자열만 반환한다.
 */
export function send(
    action: WebToAppAction,
    params: Record<string, unknown> = {},
): string {
    const message = JSON.stringify({ action, params } satisfies BridgeMessage)
    request({ kind: 'bridge', action, params, message })
    return message
}

/* ------------------------- 16.0 Scheme 연동 ------------------------- */

const ANDROID_PACKAGE = 'co.kr.bonif.bonmembership'
const IOS_SCHEME = 'mybonIf'

/**
 * 16.0 Scheme 연동
 * - Android : intent://default?version=1#Intent;scheme=mybonif://type={type}?url={url};...;end
 * - iOS     : mybonIf://type={type}?url={url}
 * @param type Scheme 에 대한 타입 구분 (예: payment)
 * @param url  필요시 사용 / 필요없으면 생략
 */
export function openScheme(type: string, url?: string): string {
    const query = `type=${type}${url ? `?url=${url}` : ''}`
    const target = isAndroid()
        ? `intent://default?version=1#Intent;scheme=mybonif://${query};` +
        `action=android.intent.action.VIEW;` +
        `category=android.intent.category.BROWSABLE;` +
        `package=${ANDROID_PACKAGE};end`
        : `${IOS_SCHEME}://${query}`

    request({ kind: 'scheme', type, url, target })
    return target
}

/* --------------------------- Bridge API --------------------------- */

export const bridge = {
    /** 1.0 로그인 완료 */
    loginCompleted: (authToken: string, memIdx: string) =>
        send('loginCompleted', { authToken, memIdx }),

    /** 2.0 로그아웃 완료 */
    logoutCompleted: () => send('logoutCompleted', {}),

    /** 3.0 소셜 로그인 요청 → loginResult 수신 */
    login: (snsChannel: SnsChannel, fnType: SnsFnType = 'login') =>
        send('login', { snsChannel, fnType }),

    /** 4.0 바코드 / QR 카메라 열기 → scanResult 수신 */
    openScanner: () => send('openScanner', {}),

    /** 5.0 알림함 열기 */
    openPushList: () => send('openPushList', {}),

    /** 6.0 연락처 열기 → contactResult 수신 */
    openContact: (maxCount: number) => send('openContact', { maxCount }),

    /** 7.0 시스템 공유창 열기 */
    share: (msg: string, url: string) => send('share', { msg, url }),

    /** 8.0 더 이상 뒤로 갈 페이지/레이어가 없을 때 앱으로 전달 */
    goBack: () => send('goBack', {}),

    /** 9.0 외부 브라우저 열기 */
    openBrowser: (url: string) => send('openBrowser', { url }),

    /** 10.0 프로그래스바 노출 / 숨김 */
    progress: (show: OnOff, backgroundDim: OnOff = 'off') =>
        send('progress', { show, backgroundDim }),

    /** 11.0 위치 정보 요청 → locationResult 수신 */
    location: (msg = '위치 정보를 사용할 수 없어 이름순으로 정렬됩니다.') =>
        send('location', { msg }),

    /** 12.0 OPEN WINDOW 닫기 */
    closeOpenWindow: () => send('closeOpenWindow', {}),

    /** 13.0 알림함 N 표시 갱신 요청 → pushStatus 수신 */
    getPushStatus: () => send('getPushStatus', {}),

    /** 14.0 권한체크 → permissionResult 수신 */
    permission: (type: PermissionType) => send('permission', { type }),

    /** 15.0 마케팅 동의여부 → adPushAgreeResult 수신 */
    adPushAgree: (agree: YN) => send('adPushAgree', { agree }),

    /** 16.0 Scheme 연동 */
    openScheme,
}
