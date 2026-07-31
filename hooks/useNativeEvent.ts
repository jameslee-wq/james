// hooks/useNativeEvent.ts
'use client'
import { useEffect, useState } from 'react'
import { onNative } from '@/lib/bridge/nativeReceiver'

export function useNativeEvent<T = Record<string, unknown>>(action: string) {
    const [data, setData] = useState<T | null>(null)

    useEffect(() => {
        const off = onNative(action, (params) => {
            setData(params as T)
        })
        return off
    }, [action])

    return data
}