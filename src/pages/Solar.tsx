
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  CalendarDays,
  ChevronDown,
  Cloud,
  CloudSun,
  Leaf,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  Sun,
  Sunrise,
  Sunset,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { predictSolar } from "../services/api";
import { useActiveSiteData } from "../hooks/useActiveSiteData";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Solar forecast", icon: Sun, href: "/solar" },
  { label: "Energy demand", icon: Activity, href: "/energy" },
  { label: "Optimization", icon: Lightbulb, href: "/optimization" },
  { label: "Devices", icon: BatteryCharging, href: "/devices" },
];

type ForecastPoint = {
  time: string;
  generation: number;
};

function toKilowatts(power: number, unit: string): number {
  const normalizedUnit = unit.trim().toLowerCase().replace(/\s+/g, "");

  if (["w", "watt", "watts"].includes(normalizedUnit)) {
    return Math.max(0, power / 1000);
  }

  if (["kw", "kilowatt", "kilowatts"].includes(normalizedUnit)) {
    return Math.max(0, power);
  }

  throw new Error(
    `The solar API returned an unsupported power unit: "${unit}". Expected W or kW.`,
  );
}

export default function Solar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState("Today");
  const [chartData, setChartData] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Illustrative scenario inputs, not live weather readings.
  const [ambientTemperature] = useState(25);
  const [moduleTemperature] = useState(30);
  const [irradiation] = useState(0.7);

  const {
    activeSite,
    loading: siteLoading,
    error: siteError,
  } = useActiveSiteData();

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      if (siteLoading) {
        setLoading(true);
        return;
      }

      if (!activeSite) {
        setChartData([]);
        setLoading(false);
        setError(
          siteError ||
            "No site selected. Create a site or select an existing site to view its solar forecast.",
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const date = new Date();

        if (period === "Tomorrow") {
          date.setDate(date.getDate() + 1);
        }

        const dayOfYear =
          Math.floor(
            (Date.UTC(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
            ) -
              Date.UTC(date.getFullYear(), 0, 1)) /
              86400000,
          ) + 1;

        const hours = [6, 8, 10, 12, 14, 16, 18, 20];

        const predictions = await Promise.all(
          hours.map(async (hour): Promise<ForecastPoint> => {
            const result = await predictSolar({
              plant_id: 1,
              site_id: activeSite.id,
              ambient_temperature: ambientTemperature,
              module_temperature: moduleTemperature,
              irradiation:
                hour >= 6 && hour <= 18 ? irradiation : 0,
              hour,
              day_of_year: dayOfYear,
              month: date.getMonth() + 1,
            });

            return {
              time: `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`,
              generation: toKilowatts(
                result.predicted_power,
                result.unit,
              ),
            };
          }),
        );

        if (!cancelled) {
          setChartData(predictions);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the solar forecast.",
          );
          setChartData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadForecast();

    return () => {
      cancelled = true;
    };
  }, [
    period,
    ambientTemperature,
    moduleTemperature,
    irradiation,
    activeSite?.id,
    siteLoading,
    siteError,
  ]);

  const peak = chartData.length
    ? Math.max(...chartData.map((point) => point.generation))
    : 0;

  const peakTime =
    chartData.length > 0
      ? chartData.find((point) => point.generation === peak)?.time ?? "—"
      : "—";

  // Approximate energy from 2-hourly kW samples using trapezoidal integration.
  // This is a sampled estimate, not a measured daily energy total.
  const sampledEnergy = chartData.reduce((total, point, index, points) => {
    if (index === 0) return 0;

    return (
      total +
      ((points[index - 1].generation + point.generation) / 2) * 2
    );
  }, 0);

  const forecastStatus = loading
    ? "Loading…"
    : error
      ? "Unavailable"
      : "API connected";

  const forecastStatusDescription = loading
    ? "Requesting model predictions"
    : error
      ? "Check the site or API connection"
      : "Predictions received from backend";

  return (
    <div className="min-h-screen bg-[#F4F8F3] text-[#244A35]">
      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#193326]/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#E4ECE1] bg-white px-5 py-6 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link to="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#43865A] text-white">
            <Leaf size={22} />
          </span>

          <span className="text-2xl font-bold tracking-tight">
            wattora<span className="text-[#43865A]">.</span>
          </span>
        </Link>

        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A397]">
          Workspace
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/solar";

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#E7F1E5] text-[#315A40]"
                    : "text-[#718276] hover:bg-[#F4F8F3] hover:text-[#244A35]"
                }`}
              >
                <Icon size={19} />
                {item.label}

                {active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#43865A]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-[#E8EEE6] pt-6">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#718276] hover:bg-[#F4F8F3]"
          >
            <Settings size={19} />
            Profile &amp; settings
          </Link>
        </div>

        <div className="mt-auto rounded-2xl bg-[#F4F8F3] p-4">
          <Leaf size={22} className="text-[#43865A]" />

          <p className="mt-3 text-sm font-semibold">
            Clean energy, made smarter.
          </p>

          <p className="mt-1 text-xs leading-5 text-[#718276]">
            Forecast production to make the most of every sunny hour.
          </p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E4ECE1] bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-[#315A40] hover:bg-[#F4F8F3] lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="text-lg font-semibold sm:text-xl">
                Solar forecast
              </h1>

              <p className="hidden text-xs text-[#718276] sm:block">
                Understand your expected solar production
              </p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-3 py-2.5 text-sm font-medium text-[#315A40] hover:bg-[#F4F8F3]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </header>

        <main className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-[#43865A]">
                SOLAR INTELLIGENCE
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Plan around the sun.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#718276]">
                Explore expected generation throughout the day and identify
                when your panels may produce the most energy.
              </p>

              <p className="mt-2 text-xs text-[#718276]">
                {siteLoading
                  ? "Loading selected site…"
                  : activeSite
                    ? `Active site: ${activeSite.name}`
                    : "No active site"}
              </p>
            </div>

            <label className="flex w-fit items-center gap-2 rounded-xl border border-[#DCE6D9] bg-white px-3 py-2.5 text-sm">
              <CalendarDays size={17} className="text-[#43865A]" />

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="bg-transparent text-[#315A40] outline-none"
                aria-label="Forecast day"
              >
                <option>Today</option>
                <option>Tomorrow</option>
              </select>

              <ChevronDown size={14} className="text-[#718276]" />
            </label>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <p className="font-semibold">Solar forecast unavailable</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">
                  Sampled energy estimate
                </p>
                <Sun size={20} className="text-[#43865A]" />
              </div>

              <p className="mt-4 text-3xl font-semibold">
                {loading ? "—" : sampledEnergy.toFixed(1)}{" "}
                <span className="text-sm font-normal text-[#718276]">
                  kWh*
                </span>
              </p>

              <p className="mt-2 text-xs text-[#94A397]">
                Estimated from 2-hourly model samples
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Peak generation</p>
                <Zap size={20} className="text-[#43865A]" />
              </div>

              <p className="mt-4 text-3xl font-semibold">
                {loading ? "—" : peak.toFixed(1)}{" "}
                <span className="text-sm font-normal text-[#718276]">
                  kW
                </span>
              </p>

              <p className="mt-2 text-xs text-[#94A397]">
                Highest predicted sample
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Peak time</p>
                <Sunrise size={20} className="text-[#43865A]" />
              </div>

              <p className="mt-4 text-3xl font-semibold">
                {loading ? "—" : peakTime}
              </p>

              <p className="mt-2 text-xs text-[#94A397]">
                Estimated from model output
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#718276]">Forecast status</p>
                <Activity size={20} className="text-[#43865A]" />
              </div>

              <p className="mt-4 text-2xl font-semibold">{forecastStatus}</p>

              <p className="mt-2 text-xs text-[#94A397]">
                {forecastStatusDescription}
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
            <div className="min-w-0 rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <div>
                <h3 className="text-base font-semibold">
                  Generation forecast
                </h3>

                <p className="mt-1 text-sm text-[#718276]">
                  Estimated solar output by time of day
                </p>
              </div>

              <div className="mt-6 h-[300px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#718276]">
                    Loading predictions from the solar API…
                  </div>
                ) : error ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-[#718276]">
                    Forecast data could not be loaded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="solarForecastFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#43865A"
                            stopOpacity={0.25}
                          />

                          <stop
                            offset="100%"
                            stopColor="#43865A"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#E8EEE6"
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="time"
                        tick={{ fill: "#829184", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />

                      <YAxis
                        tick={{ fill: "#829184", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value} kW`}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E4ECE1",
                          fontSize: 12,
                        }}
                        formatter={(value) => [
                          `${Number(value).toFixed(2)} kW`,
                          "Predicted solar generation",
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="generation"
                        stroke="#43865A"
                        strokeWidth={2.5}
                        fill="url(#solarForecastFill)"
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-[#94A397]">
                *The energy figure is an approximation based on predicted
                power samples, not a measured or guaranteed daily total.
                Weather inputs are illustrative rather than live weather data.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-5 sm:p-6">
              <h3 className="text-base font-semibold">Solar conditions</h3>

              <p className="mt-1 text-sm text-[#718276]">
                Scenario inputs used by the model
              </p>

              <div className="mt-6 rounded-2xl bg-[#F4F8F3] p-5">
                <CloudSun size={38} className="text-[#43865A]" />

                <p className="mt-4 text-2xl font-semibold">
                  Illustrative scenario
                </p>

                <p className="mt-1 text-sm text-[#718276]">
                  Not a live weather observation
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-[#DCE6D9] pt-4 text-sm">
                  <span className="flex items-center gap-2 text-[#718276]">
                    <Cloud size={16} />
                    Irradiation input
                  </span>

                  <span className="font-semibold">
                    {irradiation.toFixed(2)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#718276]">
                    Ambient temperature
                  </span>
                  <span className="font-semibold">
                    {ambientTemperature}°C
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#718276]">
                    Module temperature
                  </span>
                  <span className="font-semibold">
                    {moduleTemperature}°C
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                    <Sunrise size={19} />
                  </span>

                  <div>
                    <p className="text-sm font-medium">Morning ramp-up</p>
                    <p className="text-xs text-[#718276]">
                      Compare predicted output after sunrise
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F1E5] text-[#43865A]">
                    <Sunset size={19} />
                  </span>

                  <div>
                    <p className="text-sm font-medium">Evening decline</p>
                    <p className="text-xs text-[#718276]">
                      Compare predictions toward sunset
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#DCE6D9] bg-[#E7F1E5] p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#43865A]">
                <Lightbulb size={22} />
              </div>

              <h3 className="mt-4 font-semibold">
                Make the most of solar hours
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#526F5A]">
                If your actual system produces more energy around midday,
                consider moving flexible loads such as laundry or water
                heating into that window, where practical.
              </p>

              <Link
                to="/optimization"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#36734B] hover:text-[#244A35]"
              >
                View optimization ideas <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E4ECE1] bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F8F3] text-[#43865A]">
                <BatteryCharging size={22} />
              </div>

              <h3 className="mt-4 font-semibold">
                Connect your energy data
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#718276]">
                Predictions now come from your backend for the selected
                site's capacity limit. More accurate site-specific forecasts
                can use live weather, installation details, and historical
                generation data when those integrations are available.
              </p>

              <Link
                to="/dashboard"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#43865A] hover:text-[#244A35]"
              >
                Return to overview <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-[#E1EAE0] py-5 text-xs text-[#94A397] sm:flex-row">
            <p>© 2026 Wattora · Smarter energy, naturally.</p>

            <Link
              to="/"
              className="inline-flex items-center gap-1 hover:text-[#43865A]"
            >
              Home <ArrowUpRight size={13} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
