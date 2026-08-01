'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  bridge,
  getAppAgent,
  type RedButtonAgent,
} from '@/lib/bridge/WebAppBridge'
import { initNativeReceiver } from '@/lib/bridge/nativeReceiver'
import { useAndroidBackButton, useNativeListener } from '@/hooks/useNativeEvent'

// UserAgent 는 런타임 내내 변하지 않으므로 1회만 파싱해 캐싱한다.
let cachedAgent: RedButtonAgent | null | undefined
const subscribeAgent = () => () => { }
const getAgentSnapshot = () => {
  if (cachedAgent === undefined) cachedAgent = getAppAgent()
  return cachedAgent
}

export default function Home() {
  const [log, setLog] = useState<string[]>([])
  const [pushNew, setPushNew] = useState<'y' | 'n' | null>(null)

  // SSR 에서는 null, 클라이언트 마운트 후 실제 Agent 로 갱신 (하이드레이션 안전)
  const agent = useSyncExternalStore(subscribeAgent, getAgentSnapshot, () => null)

  const write = (line: string) => setLog((l) => [line, ...l].slice(0, 50))

  useEffect(() => {
    initNativeReceiver()

    // 브라우저 단독 테스트용 mock (앱 없이도 흐름 확인)
    if (!window.android && !window.webkit?.messageHandlers?.bridge) {
      const mock = (message: string) => {
        setLog((l) => ['[MOCK 송신] ' + message, ...l].slice(0, 50))
        mockReply(message)
      }
      window.android = { bridge: mock }
      window.webkit = { messageHandlers: { bridge: { postMessage: mock } } }
    }
  }, [])

  // 2.0 로그아웃 (APP → WEB)
  useNativeListener('logout', () => write('[앱 수신] logout'))

  // 3.0 소셜 로그인 결과
  useNativeListener('loginResult', (p) =>
    write(
      `[앱 수신] loginResult ${p.result} / ${p.snsChannel} / snsId=${p.snsId}` +
      ` / ci=${p.ci} / email=${p.email} / fnType=${p.fnType}`,
    ),
  )

  // 4.0 스캔 결과
  useNativeListener('scanResult', (p) => write(`[앱 수신] scanResult value=${p.value}`))

  // 6.0 연락처 결과 (1명이라도 Array)
  useNativeListener('contactResult', (p) =>
    write(
      `[앱 수신] contactResult ${p.list.length}건 ` +
      p.list.map((c) => `${c.name}(${c.phone})`).join(', '),
    ),
  )

  // 11.0 위치 결과 (거부/실패 시 0,0)
  useNativeListener('locationResult', (p) =>
    write(`[앱 수신] locationResult ${p.latitude}, ${p.longitude}`),
  )

  // 13.0 알림함 N 표시
  useNativeListener('pushStatus', (p) => {
    setPushNew(p.new)
    write(`[앱 수신] pushStatus new=${p.new}`)
  })

  // 14.0 권한체크 결과
  useNativeListener('permissionResult', (p) =>
    write(`[앱 수신] permissionResult ${p.result}`),
  )

  // 15.0 마케팅 동의 결과
  useNativeListener('adPushAgreeResult', (p) =>
    write(`[앱 수신] adPushAgreeResult ${p.result}`),
  )

  // 8.0 안드로이드 백 버튼: 닫을 레이어가 없으면 앱으로 goBack 재호출
  useAndroidBackButton(() => {
    write('[앱 수신] goBack')
    if (window.history.length > 1) {
      window.history.back()
      return true // 웹에서 처리함
    }
    return false // 앱으로 goBack 전달
  })

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-bold">레드버튼 WebView 연동 테스트</h1>
        <p className="mt-1 text-sm opacity-70">
          Agent:{' '}
          {agent
            ? `${agent.os} / ${agent.appVersion} / ${agent.uuid} / ${agent.deviceModel}`
            : '앱 아님 (MOCK 모드)'}
          {pushNew ? ` · 알림 N=${pushNew}` : ''}
        </p>
      </header>

      <Section title="1.0 ~ 3.0 로그인">
        <Btn onClick={() => bridge.loginCompleted('token-abcdefg', '12242')}>
          loginCompleted
        </Btn>
        <Btn onClick={() => bridge.logoutCompleted()}>logoutCompleted</Btn>
        <Btn onClick={() => bridge.login('naver', 'login')}>login(naver)</Btn>
        <Btn onClick={() => bridge.login('kakao', 'login')}>login(kakao)</Btn>
        <Btn onClick={() => bridge.login('apple', 'login')}>login(apple)</Btn>
        <Btn onClick={() => bridge.login('naver', 'info')}>login(info)</Btn>
        <Btn onClick={() => bridge.login('naver', 'withdrawal')}>login(withdrawal)</Btn>
      </Section>

      <Section title="4.0 ~ 7.0 디바이스 기능">
        <Btn onClick={() => bridge.openScanner()}>openScanner</Btn>
        <Btn onClick={() => bridge.openPushList()}>openPushList</Btn>
        <Btn onClick={() => bridge.openContact(2)}>openContact(2)</Btn>
        <Btn onClick={() => bridge.share('공유할 메세지', 'https://www.bonif.co.kr')}>
          share
        </Btn>
      </Section>

      <Section title="8.0 ~ 12.0 화면 제어">
        <Btn onClick={() => bridge.goBack()}>goBack</Btn>
        <Btn onClick={() => bridge.openBrowser('https://www.bonif.co.kr')}>
          openBrowser
        </Btn>
        <Btn onClick={() => bridge.progress('on', 'on')}>progress on</Btn>
        <Btn onClick={() => bridge.progress('off', 'off')}>progress off</Btn>
        <Btn onClick={() => bridge.location()}>location</Btn>
        <Btn onClick={() => bridge.closeOpenWindow()}>closeOpenWindow</Btn>
      </Section>

      <Section title="13.0 ~ 16.0 기타">
        <Btn onClick={() => bridge.getPushStatus()}>getPushStatus</Btn>
        <Btn onClick={() => bridge.permission('camera')}>permission(camera)</Btn>
        <Btn onClick={() => bridge.permission('galleryCa')}>permission(galleryCa)</Btn>
        <Btn onClick={() => bridge.adPushAgree('y')}>adPushAgree(y)</Btn>
        <Btn onClick={() => bridge.adPushAgree('n')}>adPushAgree(n)</Btn>
        <Btn onClick={() => bridge.openScheme('payment', 'https://www.bonif.co.kr')}>
          scheme(payment)
        </Btn>
      </Section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">로그</h2>
          <button className="text-xs underline" onClick={() => setLog([])}>
            지우기
          </button>
        </div>
        <pre className="min-h-52 overflow-auto rounded bg-neutral-900 p-3 text-xs leading-5 text-green-400 whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      </section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-200 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  )
}

/** MOCK 모드 전용: WEB → APP 메시지에 대해 APP → WEB 응답을 흉내낸다. */
function mockReply(message: string) {
  const { action, params } = JSON.parse(message) as {
    action: string
    params: Record<string, unknown>
  }

  const reply = (res: object) =>
    setTimeout(() => window.appJsInterface?.(JSON.stringify(res)), 300)

  switch (action) {
    case 'logoutCompleted':
      return reply({ action: 'logout', params: {} })
    case 'login':
      return reply({
        action: 'loginResult',
        params: {
          result: 'success',
          snsChannel: params.snsChannel,
          snsId: '2131',
          ci: 'skdfl232323232dlkf',
          email: params.snsChannel === 'kakao' ? 'xxxx@bbbbb.com' : '',
          fnType: params.fnType,
        },
      })
    case 'openScanner':
      return reply({ action: 'scanResult', params: { value: '919191919' } })
    case 'openContact':
      return reply({
        action: 'contactResult',
        params: {
          list: [
            { name: '홍길동', phone: '010-1234-5678' },
            { name: '김철수', phone: '010-9876-5432' },
          ].slice(0, Number(params.maxCount) || 1),
        },
      })
    case 'location':
      return reply({
        action: 'locationResult',
        params: { latitude: '37.534452', longitude: '128.04452' },
      })
    case 'getPushStatus':
      return reply({ action: 'pushStatus', params: { new: 'y' } })
    case 'permission':
      return reply({ action: 'permissionResult', params: { result: 'success' } })
    case 'adPushAgree':
      return reply({ action: 'adPushAgreeResult', params: { result: 'success' } })
    default:
      return
  }
}
