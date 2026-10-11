import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { resendVerification, verifyEmail } from '../services/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState(searchParams.get('message') ?? '')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setSubmitting(true)

    try {
      const result = await verifyEmail({ email: email.trim(), code })
      setSuccess(true)
      setMessage(result.message)
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to verify your email.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setMessage('')
    setResending(true)

    try {
      const result = await resendVerification(email.trim())
      setMessage(result.message)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to resend the verification code.',
      )
    } finally {
      setResending(false)
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

        <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
          {success ? <CheckCircle2 size={27} /> : <ShieldCheck size={27} />}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-[#244A35]">
          {success ? 'Email verified' : 'Verify your email'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#718276]">
          {success
            ? 'Your email is verified. Sign in to continue to Wattora.'
            : 'Enter the six-digit code sent to your email address. The code expires in 15 minutes.'}
        </p>

        {!success && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[#315A40]"
              >
                Email address
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 transition focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                <Mail size={18} className="shrink-0 text-[#91A093]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#244A35] outline-none placeholder:text-[#A0ADA1]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-[#315A40]"
              >
                Verification code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="123456"
                className="w-full rounded-xl border border-[#DCE6D9] bg-white px-4 py-3.5 text-sm tracking-[0.3em] text-[#244A35] outline-none transition placeholder:text-[#A0ADA1] focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
              />
            </div>

            {message && (
              <p
                role="status"
                className="rounded-xl border border-[#E5D9C8] bg-[#FBF7F0] px-4 py-3 text-sm leading-5 text-[#785C36]"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : 'Verify email'} <ArrowRight size={17} />
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email.trim()}
              className="w-full rounded-xl border border-[#D6E2D4] px-5 py-3.5 text-sm font-semibold text-[#315A40] transition hover:bg-[#F4F8F3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </form>
        )}

        {success && message && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-[#F4F8F3] px-4 py-3 text-sm text-[#315A40]"
          >
            {message}
          </p>
        )}

        {success ? (
          <Link
            to="/signin"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B]"
          >
            Continue to sign in <ArrowRight size={17} />
          </Link>
        ) : null}

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
