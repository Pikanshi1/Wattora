
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sun,
} from 'lucide-react'

export default function SignIn() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }

    // Authentication will be connected to the backend later.
    setError('Sign-in is not connected yet. Authentication will be added next.')
  }

  return (
    <main className="min-h-screen bg-[#F4F8F3] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-7xl overflow-hidden rounded-[2rem] border border-[#E1EAE0] bg-white shadow-sm sm:min-h-[calc(100vh-40px)] lg:grid-cols-2">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden bg-[#E7F1E5] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-[#C9DFC8]/70 blur-3xl" />

          <Link to="/" className="relative z-10 flex w-fit items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
              <Leaf size={22} />
            </span>
            <span className="text-2xl font-bold tracking-tight text-[#244A35]">
              wattora<span className="text-[#43865A]">.</span>
            </span>
          </Link>

          <div className="relative z-10 my-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D5E5D3] bg-white/80 px-3 py-2 text-xs font-semibold text-[#43865A]">
              <Sun size={14} />
              YOUR CLEAN ENERGY JOURNEY
            </span>

            <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-tight tracking-tight text-[#244A35] xl:text-5xl">
              Welcome back to a smarter energy future.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-[#647568]">
              Sign in to explore energy forecasts, understand consumption, and
              discover smarter ways to use solar power.
            </p>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/80 bg-white/60 p-2 shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1000&q=85"
                alt="Solar panels in a green renewable energy landscape"
                className="h-56 w-full rounded-[1.25rem] object-cover xl:h-64"
              />
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
              <ShieldCheck size={23} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#315A40]">
                Your energy workspace
              </p>
              <p className="mt-1 text-xs leading-5 text-[#718276]">
                One place for your forecasting and optimization tools.
              </p>
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12 xl:px-20">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#718276] transition hover:text-[#43865A] lg:hidden"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
                <Leaf size={22} />
              </span>
              <span className="text-2xl font-bold tracking-tight text-[#244A35]">
                wattora<span className="text-[#43865A]">.</span>
              </span>
            </div>

            <div className="mb-8">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
                <Leaf size={24} />
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-[#244A35] sm:text-4xl">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#718276] sm:text-base">
                Sign in to your account to continue your clean energy journey.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#315A40]"
                >
                  Email address
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] bg-white px-4 transition focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                  <Mail size={18} className="shrink-0 text-[#91A093]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#244A35] outline-none placeholder:text-[#A0ADA1]"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#315A40]"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#43865A] transition hover:text-[#315A40]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] bg-white px-4 transition focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                  <LockKeyhole
                    size={18}
                    className="shrink-0 text-[#91A093]"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#244A35] outline-none placeholder:text-[#A0ADA1]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-[#91A093] transition hover:text-[#43865A]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="status"
                  className="rounded-xl border border-[#E5D9C8] bg-[#FBF7F0] px-4 py-3 text-sm leading-5 text-[#785C36]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20"
              >
                Sign in <ArrowRight size={17} />
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E6ECE3]" />
              <span className="text-xs text-[#91A093]">New to Wattora?</span>
              <div className="h-px flex-1 bg-[#E6ECE3]" />
            </div>

            <Link
              to="/signup"
              className="flex w-full items-center justify-center rounded-xl border border-[#D6E2D4] bg-white px-5 py-3.5 text-sm font-semibold text-[#315A40] transition hover:bg-[#F4F8F3]"
            >
              Create an account
            </Link>

            <p className="mt-8 text-center text-xs leading-5 text-[#91A093]">
              By continuing, you agree to use Wattora responsibly and protect
              your account credentials.
            </p>

            <p className="mt-5 text-center text-xs text-[#91A093]">
              <Link
                to="/"
                className="transition hover:text-[#43865A]"
              >
                Return to homepage
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
