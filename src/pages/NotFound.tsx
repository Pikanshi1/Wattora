
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Leaf } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F8F3] px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <Link
          to="/"
          className="mb-12 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#244A35]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
            <Leaf size={22} />
          </span>
          wattora<span className="text-[#43865A]">.</span>
        </Link>

        <div className="mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#E7F1E5]">
          <Leaf size={48} strokeWidth={1.5} className="text-[#43865A]" />
        </div>

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-[#43865A]">
          Error 404
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#244A35] sm:text-5xl">
          Lost your way?
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-[#718276]">
          Looks like this page has wandered off the grid. Let's get you back
          to your energy dashboard.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#36734B]"
          >
            <Home size={17} />
            Go home
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-5 py-3 text-sm font-semibold text-[#315A40] transition hover:bg-[#E7F1E5]"
          >
            <ArrowLeft size={17} />
            Back to dashboard
          </Link>
        </div>

        <p className="mt-12 text-xs text-[#94A397]">
          Wattora · Smarter energy, greener tomorrow.
        </p>
      </div>
    </main>
  )
}
