
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Account creation will be enabled when authentication is connected.')
  }

  return (
    <main className="min-h-screen bg-[#F4F8F3] p-3 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-7xl overflow-hidden rounded-[2rem] border border-[#E1EAE0] bg-white lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#E7F1E5] p-10 lg:flex xl:p-14">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
              <Leaf size={22} />
            </span>
            <span className="text-2xl font-bold text-[#244A35]">wattora.</span>
          </Link>

          <div className="relative z-10 my-10">
            <span className="text-xs font-bold tracking-widest text-[#43865A]">
              A GREENER WAY FORWARD
            </span>
            <h1 className="mt-5 max-w-lg text-4xl font-semibold leading-tight text-[#244A35] xl:text-5xl">
              Your energy journey starts here.
            </h1>
            <p className="mt-5 max-w-md leading-7 text-[#647568]">
              Bring solar forecasts, demand insights, and smarter energy
              decisions together in one place.
            </p>
            <img
              src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1000&q=85"
              alt="Solar panels producing renewable energy"
              className="mt-8 h-64 w-full rounded-3xl border-4 border-white/70 object-cover"
            />
          </div>

          <p className="text-sm text-[#647568]">
            Clean energy. Smarter future.
          </p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
                <Leaf size={22} />
              </span>
              <span className="text-2xl font-bold text-[#244A35]">wattora.</span>
            </Link>

            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F1E5] text-[#43865A]">
              <UserRound size={24} />
            </span>
            <h2 className="mt-5 text-3xl font-semibold text-[#244A35] sm:text-4xl">
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#718276]">
              Join Wattora and start making smarter energy decisions today.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-[#315A40]">
                  Full name
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                  <UserRound size={18} className="text-[#91A093]" />
                  <input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[#A0ADA1]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signupEmail" className="mb-2 block text-sm font-medium text-[#315A40]">
                  Email address
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                  <Mail size={18} className="text-[#91A093]" />
                  <input
                    id="signupEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[#A0ADA1]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signupPassword" className="mb-2 block text-sm font-medium text-[#315A40]">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-[#DCE6D9] px-4 focus-within:border-[#43865A] focus-within:ring-4 focus-within:ring-[#43865A]/10">
                  <LockKeyhole size={18} className="text-[#91A093]" />
                  <input
                    id="signupPassword"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
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

              {message && (
                <p role="status" className="rounded-xl bg-[#F4F8F3] p-3 text-sm leading-6 text-[#315A40]">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#36734B] focus:outline-none focus:ring-4 focus:ring-[#43865A]/20"
              >
                Create account <ArrowRight size={17} />
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#718276]">
              Already have an account?{' '}
              <Link to="/signin" className="font-semibold text-[#43865A] hover:text-[#315A40]">
                Sign in
              </Link>
            </p>
            <p className="mt-6 text-center text-xs text-[#91A093]">
              <Link to="/" className="hover:text-[#43865A]">Back to homepage</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
