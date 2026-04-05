'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore, useTransition } from 'react'

import { useAuth } from '@/components/providers/auth-provider'
import type { Dictionary } from '@/lib/i18n'

export function AuthFormCard({
  locale,
  mode,
  dict,
}: {
  locale: string
  mode: 'login' | 'signup'
  dict: Dictionary
}) {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isLogin = mode === 'login'

  if (!isMounted) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="glass-panel rounded-[32px] border border-border p-6 sm:p-8">
          <p className="text-sm text-muted">{dict.brand}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold">
            {isLogin ? dict.auth.loginTitle : dict.auth.signupTitle}
          </h1>
          <div className="mt-6 space-y-4">
            <div className="h-12 rounded-2xl bg-surface" />
            <div className="h-12 rounded-2xl bg-surface" />
            {!isLogin ? <div className="h-12 rounded-2xl bg-surface" /> : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-panel rounded-[32px] border border-border p-6 sm:p-8">
        <p className="text-sm text-muted">{dict.brand}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">
          {isLogin ? dict.auth.loginTitle : dict.auth.signupTitle}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {isLogin
            ? dict.auth.loginSubtitle
            : dict.auth.signupSubtitle}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            setStatus('')

            startTransition(async () => {
              if (isLogin) {
                const result = await signIn(email, password)
                if (result.error) {
                  setError(result.error)
                  return
                }

                router.push(`/${locale}/home`)
                router.refresh()
                return
              }

              const result = await signUp(email, password, displayName)
              if (result.error) {
                setError(result.error)
                return
              }

              setStatus(
                result.needsEmailConfirmation
                  ? dict.auth.accountCreatedConfirm
                  : dict.auth.accountCreatedSuccess,
              )

              if (!result.needsEmailConfirmation) {
                router.push(`/${locale}/home`)
                router.refresh()
              }
            })
          }}
        >
          {!isLogin ? (
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-muted">{dict.labels.displayName}</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
                required
              />
            </label>
          ) : null}

          <label className="block space-y-2 text-sm">
            <span className="font-medium text-muted">{dict.labels.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
              required
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium text-muted">{dict.labels.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending
              ? '...'
              : isLogin
                ? dict.auth.loginTitle
                : dict.auth.signupTitle}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {status ? (
          <p className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            {status}
          </p>
        ) : null}

        <div className="mt-6 text-sm text-muted">
          {isLogin ? `${dict.auth.noAccount} ` : `${dict.auth.haveAccount} `}
          <Link
            href={`/${locale}/${isLogin ? 'signup' : 'login'}`}
            className="font-semibold text-brand-strong"
          >
            {isLogin ? dict.auth.createOne : dict.auth.signInLink}
          </Link>
        </div>
      </div>
    </div>
  )
}
