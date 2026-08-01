'use client'
import { useEffect, useState } from 'react'
import { bridge } from '@/lib/bridge/WebAppBridge'
import { initNativeReceiver, onNative } from '@/lib/bridge/nativeReceiver'
import { useNativeEvent } from '@/hooks/useNativeEvent'


interface PushStatus {
  newCnt: number
}

export default function Home() {
  const [log, setLog] = useState<string[]>([])
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 20))

  const pushStatus = useNativeEvent<PushStatus>('getPushStatus')

  useEffect(() => {
    initNativeReceiver()
    // 브라우저 단독 테스트용 mock (앱 없이도 흐름 확인)
    if (typeof window !== 'undefined' && !window.android && !window.webkit) {
      window.android = { bridge: (m: string) => push('[MOCK] ' + m) }
    }
    const off = onNative('getPushStatus', (p) =>
      push('[앱 수신] getPushStatus count=' + p.newCnt)
    )
    return off
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Web-App Bridge Test</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => bridge.call('15771577')}>call</button>
        <button onClick={() => bridge.getPushStatus()}>getPushStatus</button>
        <button onClick={() => bridge.goBack()}>goBack</button>
      </div>

      <pre style={{ background: '#111', color: '#0f0', padding: 12, minHeight: 200 }}>
        {log.join('\n')}
      </pre>

    </main>
  )
}