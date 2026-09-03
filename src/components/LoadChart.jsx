import './LoadChart.css';
import { clockLabel } from '../data/demand';

// Internal coordinate space. The SVG scales to its container via viewBox, so
// these are arbitrary units chosen to make the margin math readable.
const VIEW_W = 720;
const VIEW_H = 420;
const MARGIN = { top: 16, right: 16, bottom: 36, left: 48 };

const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;

const HOUR_MAX = 24;
const X_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

// The y domain grows with the data so an added curve can't run off the top, but
// it never drops below 90 GW — otherwise the axis would rescale under every
// small change and the curves would appear not to move at all.
function yAxis(peak) {
  const step = peak <= 105 ? 15 : peak <= 210 ? 30 : 60;
  const max = Math.max(90, Math.ceil(peak / step) * step);
  const ticks = [];
  for (let gw = 0; gw <= max; gw += step) ticks.push(gw);
  return { max, ticks };
}

const xScale = (hour) => MARGIN.left + (hour / HOUR_MAX) * PLOT_W;
const yScale = (gw, max) => MARGIN.top + PLOT_H - (gw / max) * PLOT_H;

const toPoints = (curve, max) =>
  curve.map((d) => `${xScale(d.hour).toFixed(2)},${yScale(d.gw, max).toFixed(2)}`).join(' ');

// Axis reads in the same plain clock the rest of the page uses.
const axisLabel = (hour) => clockLabel(hour % 24);

function LoadChart({ baseline, comparison, baselineLabel, comparisonLabel }) {
  const peak = Math.max(...baseline.map((d) => d.gw), ...comparison.map((d) => d.gw));
  const { max, ticks } = yAxis(peak);

  return (
    <figure className="load-chart">
      <svg
        className="load-chart__svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`${baselineLabel} peaks at ${Math.max(...baseline.map((d) => d.gw)).toFixed(1)} gigawatts, plotted against ${comparisonLabel} across a 24 hour day.`}
      >
        {/* horizontal gridlines + y axis labels */}
        {ticks.map((gw) => (
          <g key={gw}>
            <line
              className="load-chart__grid"
              x1={MARGIN.left}
              x2={MARGIN.left + PLOT_W}
              y1={yScale(gw, max)}
              y2={yScale(gw, max)}
            />
            <text
              className="load-chart__label load-chart__label--y"
              x={MARGIN.left - 8}
              y={yScale(gw, max)}
            >
              {gw}
            </text>
          </g>
        ))}

        {/* x axis labels */}
        {X_TICKS.map((hour) => (
          <text
            key={hour}
            className="load-chart__label load-chart__label--x"
            x={xScale(hour)}
            y={MARGIN.top + PLOT_H + 20}
          >
            {axisLabel(hour)}
          </text>
        ))}

        {/* axis lines */}
        <line
          className="load-chart__axis"
          x1={MARGIN.left}
          x2={MARGIN.left + PLOT_W}
          y1={MARGIN.top + PLOT_H}
          y2={MARGIN.top + PLOT_H}
        />

        <polyline
          className="load-chart__line load-chart__line--comparison"
          points={toPoints(comparison, max)}
        />
        <polyline
          className="load-chart__line load-chart__line--baseline"
          points={toPoints(baseline, max)}
        />

        <text className="load-chart__unit" x={MARGIN.left - 8} y={MARGIN.top - 4}>
          GW
        </text>
      </svg>

      <figcaption className="load-chart__legend">
        <span className="load-chart__key">
          <span className="load-chart__swatch load-chart__swatch--baseline" aria-hidden="true" />
          {baselineLabel}
        </span>
        <span className="load-chart__key">
          <span className="load-chart__swatch load-chart__swatch--comparison" aria-hidden="true" />
          {comparisonLabel}
        </span>
      </figcaption>
    </figure>
  );
}

export default LoadChart;
