'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_VISIBLE_MS = 350
const NAVIGATION_EVENT = 'nihongotaku:navigation-start'

function isInternalNavigationClick(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false
  }

  const target = event.target
  if (!(target instanceof Element)) return false

  const anchor = target.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return false

  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  const nextUrl = new URL(anchor.href, window.location.href)
  if (nextUrl.origin !== window.location.origin) return false

  const currentUrl = new URL(window.location.href)
  if (
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search
  ) {
    return false
  }

  return true
}

export function startNavigationFeedback() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function NavigationFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isActive, setIsActive] = useState(false)
  const startedAtRef = useRef(0)
  const hideTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    clearTimers()
    startedAtRef.current = window.performance.now()
    setIsActive(true)
  }, [clearTimers])

  const finish = useCallback(() => {
    if (!isActive) return

    const visibleFor = window.performance.now() - startedAtRef.current
    const remaining = Math.max(0, MIN_VISIBLE_MS - visibleFor)

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsActive(false)
      clearTimers()
    }, remaining)
  }, [clearTimers, isActive])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigationClick(event)) {
        start()
      }
    }

    const handleNavigationStart = () => start()

    document.addEventListener('click', handleClick, true)
    window.addEventListener(NAVIGATION_EVENT, handleNavigationStart)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener(NAVIGATION_EVENT, handleNavigationStart)
      clearTimers()
    }
  }, [clearTimers, start])

  useEffect(() => {
    finish()
  }, [finish, pathname, searchParams])

  return (
    <div
      aria-hidden="true"
      className={`route-progress-track ${isActive ? 'is-active' : ''}`}
    >
      <span className="route-progress-bar" />
    </div>
  )
}
