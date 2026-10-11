
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Leaf,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

export default function VerifyEmail() {
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [resent, setResent] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setMessage('Please enter a valid 6-digit verification code.')
      return
    }

    setSubmitted(true)
  }

  function handleResend() {
    setResent(true)
    setMessage(
      'Email delivery is not connected yet. Verification codes will be sent after authentication is configured.',
    )
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

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
          {submitted ? (
            <CheckCircle2 size={27} />
          ) : (
            <MailCheck size={27} />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#244A35]">
          {submitted ? 'Email verified!' : 'Verify your email'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#718276]">
          {submitted
            ? 'The code format is valid. Actual email verification will work once the authentication backend is connected.'
            : 'We use email verification to help keep your Wattora account secure. Enter the 6-digit code provided in your email.'}
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="verificationCode"
                className="mb-2 block text-sm font-medium text-[#315A40]"
              >
                Verification code
              </label>

              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setMessage('')
                }}
                placeholder="000000"
                className="w-full rounded-xl border border-[#DCE6D9] bg-[#FCFDFC] px-4 py-4 text-center text-2xl font-semibold tracking-[0.5em] text-[#244A35] outline-none placeholder:text-[#C4CEC2] focus:border-[#43865A] focus:ring-4 focus:ring-[#43865A]/10"
              />
              <p className="mt-2 text-xs text-[#718276]">
                Enter all 6 digits.
              </p>
            </div>

            {message && (
              <p
                role="status"
                className="rounded-xl border border-[#DCE6D9] bg-[#F4F8F3] px-4 py-3 text-sm text-[#315A40]"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20"
            >
              Verify email <ArrowRight size={17} />
            </button>

            <div className="text-center">
              <span className="text-sm text-[#718276]">
                Didn’t receive a code?{' '}
              </span>
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#43865A] hover:text-[#315A40]"
              >
                <RefreshCw size={13} />
                Resend code
              </button>
            </div>

            {resent && (
              <p className="text-center text-xs leading-5 text-[#718276]">
                Email delivery is not configured yet.
              </p>
            )}
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#DCE6D9] bg-[#F4F8F3] p-4">
              <ShieldCheck size={21} className="mt-0.5 shrink-0 text-[#43865A]" />
              <p className="text-sm leading-6 text-[#315A40]">
                The verification screen is working. Real verification still
                needs to be connected to your authentication service.
              </p>
            </div>

            <Link
              to="/signin"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B]"
            >
              Continue to sign in <ArrowRight size={17} />
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
