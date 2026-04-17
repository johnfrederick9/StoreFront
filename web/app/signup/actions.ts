'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SignupState =
  | { ok?: boolean; needsConfirmation?: boolean; error?: string }
  | null

export async function signUp(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!fullName) return { error: 'Please enter your name.' }
  if (fullName.length > 80) return { error: 'Name is too long.' }
  if (!email) return { error: 'Email is required.' }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()
  const origin =
    (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL!

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return {
        error: 'An account with this email already exists. Try signing in.',
      }
    }
    return { error: error.message }
  }

  // Supabase returns a session immediately when email confirmation is disabled
  // in the project settings. Otherwise the user needs to confirm first.
  if (data.session) {
    redirect('/dashboard')
  }

  return { ok: true, needsConfirmation: true }
}
