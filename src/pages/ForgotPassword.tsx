
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Mail,
  ShieldCheck,
} from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
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
          {submitted ? <CheckCircle2 size={27} /> : <ShieldCheck size={27} />}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-[#244A35]">
          {submitted ? 'Check your inbox' : 'Forgot your password?'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#718276]">
          {submitted
            ? 'If an account exists for this email, you will receive instructions to reset your password once email delivery is connected.'
            : 'No worries. Enter the email address associated with your account and we’ll help you get back in.'}
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#315A40]">
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

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20"
            >
              Send reset instructions <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-8 w-full rounded-xl border border-[#D6E2D4] px-5 py-3.5 text-sm font-semibold text-[#315A40] transition hover:bg-[#F4F8F3]"
          >
            Try another email
          </button>
        )}

        <div className="mt-8 border-t border-[#E6ECE3] pt-6">
          <Link
            to="/signin"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-[#43865A] transition hover:text-[#315A40]"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
