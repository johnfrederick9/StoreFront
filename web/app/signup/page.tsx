'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShoppingBag,
  User,
} from 'lucide-react'
import { useActionState, useState } from 'react'
import { signUp, type SignupState } from './actions'

async function action(
  _: SignupState,
  formData: FormData,
): Promise<SignupState> {
  return signUp(_, formData)
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    action,
    null,
  )
  const [showPassword, setShowPassword] = useState(false)

  if (state?.needsConfirmation) {
    return (
      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[var(--brand-soft)] to-transparent" />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We sent a confirmation link to your email. Click it to activate
            your account.
          </p>
          <Link href="/login" className="btn-secondary mt-8">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-[var(--brand-soft)] to-transparent" />

      <div className="mx-auto max-w-md px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            Start selling in a few minutes. No credit card required.
          </p>
        </div>

        <div className="card mt-8 p-6 sm:p-7">
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <label htmlFor="full_name" className="label">
                Full name
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Jane Smith"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="hint">Use at least 8 characters.</p>
            </div>

            {state?.error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-primary mt-2 !py-2.5"
            >
              {pending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--brand)] hover:text-[var(--brand-hover)]"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you agree to the terms and privacy policy.
        </p>
      </div>
    </main>
  )
}
