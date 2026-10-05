import { formatKg } from "@/lib/sessions/format";
import { cn } from "@/lib/utils";

const W = 280;
const H = 170;

// Line + area chart of top-set kg over time (History · Progress in /design).
// Colours come from the exercise's workout type.
export function ProgressChart({
  values,
  labels,
  stroke,
  fill,
  dot,
  title,
}: {
  values: number[];
  labels: [string, string, string]; // first, middle, last date
  stroke: string; // CSS colour, e.g. var(--lower)
  fill: string;
  dot: string; // bg-* class
  title: string;
}) {
  const min = Math.floor((Math.min(...values) - 2.5) / 5) * 5;
  const max = Math.ceil((Math.max(...values) + 2.5) / 5) * 5;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - ((v - Math.max(0, min)) / (max - Math.max(0, min))) * H;
  const lo = Math.max(0, min);
  const mid = Math.round((lo + max) / 2 / 2.5) * 2.5;
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0)},${H} L${line.split(" ").join(" L")} L${x(values.length - 1)},${H} Z`;
  const last = values.length - 1;

  return (
    <figure className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface-1 px-4 pt-4 pb-3">
      <div className="relative h-[170px]">
        {[max, mid, lo].map((v) => (
          <div key={v} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${(y(v) / H) * 100}%` }}>
            <span className="h-px flex-1 bg-line" />
            <span className="w-[30px] text-right text-xs font-semibold text-text-3">{formatKg(v)}</span>
          </div>
        ))}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={title}
          className="absolute inset-y-0 left-0 h-full w-[calc(100%-38px)] overflow-visible"
        >
          <path d={area} style={{ fill }} />
          <polyline
            points={line}
            vectorEffect="non-scaling-stroke"
            style={{ fill: "none", stroke, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" }}
          />
        </svg>
        <span
          aria-hidden
          className={cn("absolute size-3.5 -translate-1/2 rounded-full border-[3px] border-surface-1", dot)}
          style={{ left: `calc((100% - 38px) * ${x(last) / W})`, top: `${(y(values[last]) / H) * 100}%` }}
        />
      </div>
      <figcaption className="flex justify-between pr-[38px] text-xs font-semibold text-text-3">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </figcaption>
    </figure>
  );
}
