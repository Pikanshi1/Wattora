
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  ChartNoAxesCombined,
  Check,
  Leaf,
  Menu,
  Sun,
  Zap,
  X,
} from 'lucide-react'

const features = [
  {
    icon: Sun,
    number: '01',
    title: 'Solar forecasting',
    description:
      'Predict solar generation using weather conditions and historical production data.',
    color: 'bg-[#E7F1E5]',
  },
  {
    icon: ChartNoAxesCombined,
    number: '02',
    title: 'Energy intelligence',
    description:
      'Understand consumption patterns and anticipate future electricity demand.',
    color: 'bg-[#EAF1E8]',
  },
  {
    icon: BatteryCharging,
    number: '03',
    title: 'Smart optimization',
    description:
      'Discover smarter ways to schedule energy usage and make the most of solar power.',
    color: 'bg-[#E1EFE3]',
  },
]

const steps = [
  {
    number: '01',
    title: 'Collect data',
    description:
      'Bring together solar production, electricity consumption, and weather information.',
  },
  {
    number: '02',
    title: 'Forecast energy',
    description:
      'Use machine learning to estimate future solar generation and energy demand.',
  },
  {
    number: '03',
    title: 'Optimize usage',
    description:
      'Turn predictions into practical recommendations for more efficient energy use.',
  },
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen overflow-hidden bg-[#F4F8F3] text-[#244A35]">
      {/* Navigation */}
      <header className="relative z-20 border-b border-[#E5ECE2] bg-white/90">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
              <Leaf size={23} />
            </span>
            <span className="text-2xl font-bold tracking-tight">
              wattora<span className="text-[#43865A]">.</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#718276] md:flex">
            <a href="#features" className="transition hover:text-[#43865A]">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-[#43865A]">
              How it works
            </a>
            <a href="#about" className="transition hover:text-[#43865A]">
              About
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/signin"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-[#F4F8F3]"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#43865A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734B]"
            >
              Get started <ArrowRight size={16} />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-xl border border-[#E2EAE0] p-2.5 md:hidden"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-[#E5ECE2] bg-white px-5 py-4 md:hidden">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm hover:bg-[#F4F8F3]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm hover:bg-[#F4F8F3]"
            >
              How it works
            </a>
            <a
              href="#about"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm hover:bg-[#F4F8F3]"
            >
              About Wattora
            </a>
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm hover:bg-[#F4F8F3]"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-xl bg-[#43865A] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DCE9D9] bg-white px-3.5 py-2 text-xs font-semibold text-[#43865A] shadow-sm">
            <Leaf size={14} />
            CLEAN ENERGY, SMARTER FUTURE
          </div>

          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-[#244A35] sm:text-5xl lg:text-6xl">
            Power a greener tomorrow.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-[#718276] sm:text-lg sm:leading-8">
            Forecast solar energy, understand electricity demand, and make
            smarter energy decisions with machine learning.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#43865A] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#43865A]/15 transition hover:-translate-y-0.5 hover:bg-[#36734B]"
            >
              Get started <ArrowRight size={17} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6E2D4] bg-white px-5 py-3.5 text-sm font-semibold text-[#315A40] transition hover:border-[#43865A]"
            >
              Explore platform <ArrowDownRight size={17} />
            </a>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#718276]">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#43865A]" />
              Data-driven insights
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#43865A]" />
              Smarter energy use
            </span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative">
          <div className="absolute -right-5 -top-6 h-40 w-40 rounded-full bg-[#DDEBDD] blur-3xl" />
          <div className="absolute -bottom-6 -left-5 h-40 w-40 rounded-full bg-[#E2EDE0] blur-3xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-[#E5EEE2] p-3 shadow-xl shadow-[#244A35]/10 sm:p-4">
            <div className="relative min-h-[310px] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#DCEBDD] via-[#C5DEC7] to-[#8EB69A] sm:min-h-[400px]">
              <img
                src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=85"
                alt="Solar panels generating clean renewable energy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#193D2C]/65 via-transparent to-white/10" />

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3.5 py-3 shadow-lg backdrop-blur sm:left-5 sm:top-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Sun size={20} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#244A35]">
                    Clean energy
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#718276]">
                    A smarter way forward
                  </p>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/50 bg-white/90 p-4 shadow-lg backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#718276]">
                      Energy intelligence
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#244A35] sm:text-xl">
                      A brighter energy future
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F1E5] text-[#43865A]">
                    <Zap size={22} />
                  </span>
                </div>
                <div className="mt-4 flex gap-1.5">
                  <span className="h-1.5 flex-1 rounded-full bg-[#43865A]" />
                  <span className="h-1.5 flex-1 rounded-full bg-[#77A982]" />
                  <span className="h-1.5 flex-1 rounded-full bg-[#B9D4B8]" />
                  <span className="h-1.5 flex-1 rounded-full bg-[#DCE9D9]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <article
                key={feature.number}
                className="group rounded-2xl border border-[#E4EBE1] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#244A35]/5 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} text-[#43865A]`}>
                    <Icon size={23} />
                  </span>
                  <span className="text-sm font-medium text-[#A0B0A0]">
                    {feature.number}
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-semibold text-[#244A35]">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#718276]">
                  {feature.description}
                </p>

                <a
                  href="#how-it-works"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#43865A] transition group-hover:gap-3"
                >
                  Learn more <ArrowRight size={15} />
                </a>
              </article>
            )
          })}
        </div>
      </section>

      {/* About and impact */}
      <section id="about" className="scroll-mt-20 border-y border-[#E4EBE1] bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
          <div>
            <span className="text-xs font-bold tracking-[0.18em] text-[#43865A]">
              WHY WATTORA?
            </span>
            <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-[#244A35] sm:text-4xl">
              Better energy decisions start with better predictions.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#718276]">
              Renewable energy is variable, and electricity demand changes
              throughout the day. Wattora brings forecasting and optimization
              together to help make energy management more informed.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Understand expected solar generation',
                'Anticipate electricity demand',
                'Explore practical energy-saving opportunities',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E7F1E5] text-[#43865A]">
                    <Check size={13} />
                  </span>
                  <p className="text-sm leading-6 text-[#526B58]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#F4F8F3] p-5 sm:p-8">
            <div className="rounded-2xl border border-[#E2EAE0] bg-white p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#244A35]">
                    The Wattora approach
                  </p>
                  <p className="mt-1 text-xs text-[#718276]">
                    From energy data to better decisions
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                  <Leaf size={21} />
                </span>
              </div>

              <div className="mt-7 space-y-3">
                {[
                  { label: 'Solar generation', width: '86%' },
                  { label: 'Demand forecasting', width: '72%' },
                  { label: 'Energy optimization', width: '92%' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-[#F4F8F3] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[#315A40]">
                        {item.label}
                      </span>
                      <ArrowUpRight size={16} className="text-[#43865A]" />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E1EAE0]">
                      <div
                        className="h-full rounded-full bg-[#76A982]"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-[#8A9A8C]">
                Illustrative visualization — actual metrics will appear when
                the forecasting models and API are connected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.18em] text-[#43865A]">
            HOW IT WORKS
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#244A35] sm:text-4xl">
            Three steps toward smarter energy.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#718276]">
            Turn energy data into forecasts and forecasts into useful
            recommendations.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-[#E1EAE0] bg-white p-6 sm:p-8"
            >
              <span className="text-sm font-bold tracking-widest text-[#79A784]">
                STEP {step.number}
              </span>
              <h3 className="mt-5 text-xl font-semibold text-[#244A35]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#718276]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-[2rem] border border-[#DCE8D9] bg-[#E7F1E5] p-7 sm:p-10 lg:flex-row lg:items-center lg:p-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#43865A]">
              <Leaf size={14} /> BUILD A SMARTER ENERGY FUTURE
            </span>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#244A35] sm:text-4xl">
              Ready to rethink the way you use energy?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#647568] sm:text-base">
              Explore how solar forecasting, demand prediction, and intelligent
              recommendations can work together.
            </p>
          </div>

          <Link
            to="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#43865A] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#36734B]"
          >
            Get started <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E1EAE0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#43865A] text-white">
              <Leaf size={20} />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#244A35]">
              wattora<span className="text-[#43865A]">.</span>
            </span>
          </Link>

          <p className="text-sm text-[#718276]">
            Clean energy. Smarter future.
          </p>

          <div className="flex flex-wrap gap-5 text-sm text-[#718276]">
            <a href="#features" className="hover:text-[#43865A]">
              Features
            </a>
            <a href="#about" className="hover:text-[#43865A]">
              About
            </a>
            <Link to="/signin" className="hover:text-[#43865A]">
              Sign in
            </Link>
          </div>

          <p className="text-xs text-[#8A9A8C]">
            © {new Date().getFullYear()} Wattora
          </p>
        </div>
      </footer>
    </main>
  )
}
