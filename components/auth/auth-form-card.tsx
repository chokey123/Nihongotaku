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
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isLogin = mode === 'login'
  const copy = {
    forgot:
      locale === 'en'
        ? 'Forgot password?'
        : locale === 'ja'
          ? 'パスワードをお忘れですか？'
          : '忘記密碼？',
    show:
      locale === 'en'
        ? 'Show'
        : locale === 'ja'
          ? '表示'
          : '顯示',
    hide:
      locale === 'en'
        ? 'Hide'
        : locale === 'ja'
          ? '隱藏'
          : '隱藏',
    resetSent:
      locale === 'en'
        ? 'Password reset email sent. Please check your inbox.'
        : locale === 'ja'
          ? 'パスワード再設定メールを送信しました。'
          : '重設密碼信件已寄出，請檢查信箱。',
  }

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
                suppressHydrationWarning
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
              suppressHydrationWarning
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
              required
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium text-muted">{dict.labels.password}</span>
            <div className="flex overflow-hidden rounded-2xl border border-border bg-surface">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                suppressHydrationWarning
                className="w-full bg-transparent px-4 py-3 outline-none transition focus:border-brand"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="px-4 text-sm font-semibold text-muted transition hover:text-brand-strong"
              >
                {showPassword ? copy.hide : copy.show}
              </button>
            </div>
          </label>

          {isLogin ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStatus('')

                  startTransition(async () => {
                    if (!email.trim()) {
                      router.push(`/${locale}/reset-password`)
                      return
                    }

                    const result = await requestPasswordReset(email, locale)
                    if (result.error) {
                      setError(result.error)
                      return
                    }

                    setStatus(copy.resetSent)
                  })
                }}
                className="text-sm font-semibold text-brand-strong transition hover:opacity-80"
              >
                {copy.forgot}
              </button>
            </div>
          ) : null}

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
