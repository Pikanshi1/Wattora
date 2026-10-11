
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  LockKeyhole,
} from 'lucide-react'
import { resetPassword } from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState(
    token ? '' : 'This password reset link is missing or invalid.',
  )
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!token) {
      setMessage('This password reset link is missing or invalid.')
      return
    }

    if (password.length < 8) {
      setMessage('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match. Please try again.')
      return
    }

    setLoading(true)
    try {
      await resetPassword({ token, password })
      setSuccess(true)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your password.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F8F3] px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-[#E1EAE0] bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="mb-10 flex w-fit items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
            <Leaf size={22} />
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#244A35]">
            wattora<span className="text-[#43865A]">.</span>
          </span>
        </Link>

        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
          {success ? <CheckCircle2 size={27} /> : <KeyRound size={27} />}
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#244A35]">
          {success ? 'Password updated' : 'Create a new password'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#718276]">
          {success
            ? 'Your password was changed. Sign in with your new password to continue.'
            : 'Choose a strong password for your Wattora account. Use at least 8 characters.'}
        </p>

        {!success && token ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-[#315A40]">
                New password
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                <LockKeyhole size={18} className="shrink-0 text-[#91A093]" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter new password"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[#A0ADA1]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#91A093] hover:text-[#43865A]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-[#315A40]">
                Confirm new password
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                <LockKeyhole size={18} className="shrink-0 text-[#91A093]" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter password again"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[#A0ADA1]"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[#91A093] hover:text-[#43865A]"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {message && (
              <p role="alert" className="rounded-xl border border-[#E8D9D5] bg-[#FBF5F3] px-4 py-3 text-sm text-[#965D50]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Update password'} <ArrowRight size={17} />
            </button>
          </form>
        ) : success ? (
          <Link
            to="/signin"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B]"
          >
            Continue to sign in <ArrowRight size={17} />
          </Link>
        ) : (
          <div className="mt-8 space-y-4">
            {message && (
              <p role="alert" className="rounded-xl border border-[#E8D9D5] bg-[#FBF5F3] px-4 py-3 text-sm text-[#965D50]">
                {message}
              </p>
            )}
            <Link
              to="/forgot-password"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B]"
            >
              Request a new reset link <ArrowRight size={17} />
            </Link>
          </div>
        )}

        <div className="mt-8 border-t border-[#E6ECE3] pt-6">
          <Link
            to="/signin"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-[#43865A] hover:text-[#315A40]"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
