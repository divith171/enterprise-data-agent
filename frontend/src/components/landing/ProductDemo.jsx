import { Reveal } from "./Reveal";

const ROWS = [
  { region: "West", revenue: "$1.24M", growth: "+21.6%", up: true },
  { region: "South", revenue: "$0.98M", growth: "+7.7%", up: true },
  { region: "North", revenue: "$0.81M", growth: "+2.5%", up: true },
  { region: "East", revenue: "$0.76M", growth: "-7.3%", up: false },
];

export const ProductDemo = () => (
  <section
    id="product"
    data-testid="product-section"
    className="relative bg-deep"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent"
    />
    <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 md:px-12 md:py-36 lg:grid-cols-12 lg:gap-12 lg:px-16">
      <div className="lg:col-span-5">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
            The product
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-4 text-3xl font-medium leading-[1.08] tracking-tight text-ink md:text-5xl">
            Ask the question.
            <br />
            Get the answer.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 max-w-md text-base leading-relaxed text-mist md:text-lg">
            No dashboards to build. No SQL to write. Ask DataKat the same way
            you'd ask an analyst.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.2} className="lg:col-span-7">
        <div
          data-testid="product-console"
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"
          />
          <div className="p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">
              Question
            </p>
            <p
              data-testid="demo-question"
              className="mt-3 text-lg font-medium text-ink md:text-xl"
            >
              Which region drove our growth last quarter?
            </p>
          </div>
          <div className="border-t border-white/5 p-6 md:p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand">
              DataKat
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80 md:text-base">
              West generated the strongest revenue growth last quarter, while
              East declined compared with the previous quarter. South and North
              grew more modestly.
            </p>
          </div>
          <div className="border-t border-white/5 px-6 pb-7 pt-2 md:px-8 md:pb-9">
            <table className="w-full text-sm" data-testid="demo-results-table">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/35">
                  <th scope="col" className="py-4 font-medium">Region</th>
                  <th scope="col" className="py-4 text-right font-medium">Revenue</th>
                  <th scope="col" className="py-4 text-right font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr
                    key={r.region}
                    data-testid={`demo-row-${r.region.toLowerCase()}`}
                    className="border-t border-white/5 transition-colors duration-300 hover:bg-white/[0.02]"
                  >
                    <td className="py-3.5 text-white/90">{r.region}</td>
                    <td className="py-3.5 text-right text-white/90 [font-feature-settings:'tnum']">
                      {r.revenue}
                    </td>
                    <td
                      className={`py-3.5 text-right font-medium [font-feature-settings:'tnum'] ${
                        r.up ? "text-brand" : "text-rose-300/80"
                      }`}
                    >
                      {r.growth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);
