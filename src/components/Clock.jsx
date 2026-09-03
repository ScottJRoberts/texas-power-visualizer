import { useCallback, useRef } from 'react';
import './Clock.css';
import { clockLabel } from '../data/demand';

const SIZE = 200;
const C = SIZE / 2;
const R = 76;
const TAU = Math.PI * 2;

// Midnight at the top, running clockwise, one turn per day.
const pointAt = (hour) => {
  const angle = (hour / 24) * TAU - Math.PI / 2;
  return [C + R * Math.cos(angle), C + R * Math.sin(angle)];
};

// Arc from midnight round to the current hour.
function arcPath(hour) {
  if (hour <= 0) return '';
  const [x, y] = pointAt(hour);
  const [sx, sy] = pointAt(0);
  const large = hour > 12 ? 1 : 0;
  return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${x} ${y}`;
}

function Clock({ hour, onHourChange }) {
  const ref = useRef(null);
  const dragging = useRef(false);

  const hourFromEvent = useCallback((event) => {
    const svg = ref.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    // Work in the SVG's own coordinate space so scaling does not skew the angle.
    const x = ((event.clientX - rect.left) / rect.width) * SIZE - C;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE - C;
    const angle = Math.atan2(y, x) + Math.PI / 2;
    const turns = ((angle / TAU) % 1 + 1) % 1;
    return Math.round(turns * 24) % 24;
  }, []);

  const apply = useCallback(
    (event) => {
      const next = hourFromEvent(event);
      if (next !== null && next !== hour) onHourChange(next);
    },
    [hourFromEvent, hour, onHourChange],
  );

  const onPointerDown = (event) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    apply(event);
  };

  const onPointerMove = (event) => {
    if (dragging.current) apply(event);
  };

  const onPointerUp = (event) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    onHourChange((hour + step + 24) % 24);
  };

  const [hx, hy] = pointAt(hour);

  return (
    <div className="clock">
      <svg
        ref={ref}
        className="clock__dial"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="slider"
        tabIndex={0}
        aria-label="Hour of day"
        aria-valuemin={0}
        aria-valuemax={23}
        aria-valuenow={hour}
        aria-valuetext={clockLabel(hour)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <circle className="clock__track" cx={C} cy={C} r={R} />
        <path className="clock__fill" d={arcPath(hour)} />

        {[0, 6, 12, 18].map((tick) => {
          const [tx, ty] = pointAt(tick);
          return <circle key={tick} className="clock__tick" cx={tx} cy={ty} r="2" />;
        })}

        <circle className="clock__handle" cx={hx} cy={hy} r="8" />

        <text className="clock__time" x={C} y={C - 2}>
          {clockLabel(hour)}
        </text>
        <text className="clock__caption" x={C} y={C + 18}>
          drag to scrub
        </text>
      </svg>
    </div>
  );
}

export default Clock;
