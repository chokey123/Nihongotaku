'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/components/providers/auth-provider'
import { supabase } from '@/lib/supabase/client'

const copyByLocale = {
  zh: {
    title: '重設密碼',
    requestHint: '輸入你的 Email，我們會寄送重設密碼連結給你。',
    updateHint: '請輸入新的密碼。',
    email: 'Email',
    password: '新密碼',
    confirmPassword: '確認新密碼',
    send: '寄送重設連結',
    update: '更新密碼',
    backToLogin: '回到登入',
    sent: '重設密碼連結已寄出，請檢查你的信箱。',
    success: '密碼已更新，正在帶你回登入頁。',
    mismatch: '兩次輸入的密碼不一致。',
    show: '顯示',
    hide: '隱藏',
  },
  en: {
    title: 'Reset Password',
    requestHint: 'Enter your email and we will send you a password reset link.',
    updateHint: 'Enter your new password below.',
    email: 'Email',
    password: 'New password',
    confirmPassword: 'Confirm new password',
    send: 'Send reset link',
    update: 'Update password',
    backToLogin: 'Back to login',
    sent: 'Password reset email sent. Please check your inbox.',
    success: 'Password updated. Taking you back to login.',
    mismatch: 'The two passwords do not match.',
    show: 'Show',
    hide: 'Hide',
  },
  ja: {
    title: 'パスワード再設定',
    requestHint: 'メールアドレスを入力すると、再設定リンクを送信します。',
    updateHint: '新しいパスワードを入力してください。',
    email: 'Email',
    password: '新しいパスワード',
    confirmPassword: '新しいパスワード（確認）',
    send: '再設定リンクを送信',
    update: 'パスワードを更新',
    backToLogin: 'ログインへ戻る',
    sent: 'パスワード再設定メールを送信しました。受信箱をご確認ください。',
    success: 'パスワードを更新しました。ログイン画面へ戻ります。',
    mismatch: '確認用パスワードが一致しません。',
    show: '表示',
    hide: '非表示',
  },
} as const

export function ResetPasswordCard({ locale }: { locale: string }) {
  const router = useRouter()
  const { requestPasswordReset, updatePassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [isPending, startTransition] = useTransition()
  const copy = useMemo(
    () =>
      copyByLocale[
        locale === 'en' || locale === 'ja' || locale === 'zh' ? locale : 'zh'
      ],
    [locale],
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })

    let timeoutId: number | null = null

    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=recovery')
    ) {
      timeoutId = window.setTimeout(() => {
        setIsRecoveryMode(true)
      }, 0)
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-panel rounded-[32px] border border-border p-6 sm:p-8">
        <p className="text-sm text-muted">Nihongotaku</p>
        <h1 className="mt-2 font-heading text-3xl font-bold">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {isRecoveryMode ? copy.updateHint : copy.requestHint}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            setStatus('')

            startTransition(async () => {
              if (!isRecoveryMode) {
                const result = await requestPasswordReset(email, locale)
                if (result.error) {
                  setError(result.error)
                  return
                }

                setStatus(copy.sent)
                return
              }

              if (password !== confirmPassword) {
                setError(copy.mismatch)
                return
              }

              const result = await updatePassword(password)
              if (result.error) {
                setError(result.error)
                return
              }

              setStatus(copy.success)
              window.setTimeout(() => {
                router.push(`/${locale}/login`)
              }, 800)
            })
          }}
        >
          {!isRecoveryMode ? (
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-muted">{copy.email}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
                required
              />
            </label>
          ) : (
            <>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-muted">{copy.password}</span>
                <div className="flex overflow-hidden rounded-2xl border border-border bg-surface">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent px-4 py-3 outline-none"
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
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-muted">
                  {copy.confirmPassword}
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-brand"
                  required
                  minLength={6}
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isPending ? '...' : isRecoveryMode ? copy.update : copy.send}
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
          <Link
            href={`/${locale}/login`}
            className="font-semibold text-brand-strong"
          >
            {copy.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  )
}
