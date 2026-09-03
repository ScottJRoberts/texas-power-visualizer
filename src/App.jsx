import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './App.css';
import FleetTable from './components/FleetTable';
import Lightswitch from './components/Lightswitch';
import LoadChart from './components/LoadChart';
import SourcesCard from './components/SourcesCard';
import StatusBar from './components/StatusBar';
import SupplyForm from './components/SupplyForm';
import WinAlert from './components/WinAlert';
import { toGw } from './data/demand';
import {
  BASE_CURVE,
  DEMAND_2030,
  DEMAND_TODAY,
  EXISTING_FLEET_COUNTS,
  mergeCounts,
} from './data/scenario';
import {
  applySupply,
  availableSupply,
  generationNameplate,
  shortfall,
  SUPPLY_OPTIONS,
} from './data/supplyOptions';

const CELEBRATION_MS = 10_000;

// The 2030 hole with nothing built: the worst single hour the user has to close.
// Constant, so compute it once.
const BASELINE_GAP_MW = shortfall(
  applySupply(BASE_CURVE, DEMAND_2030, EXISTING_FLEET_COUNTS),
  DEMAND_2030,
).worstGapMW;

const INITIAL_COUNTS = Object.fromEntries(SUPPLY_OPTIONS.map((option) => [option.id, 0]));

function countsReducer(state, action) {
  if (action.type === 'reset') return INITIAL_COUNTS;
  return state[action.id] === action.count
    ? state
    : { ...state, [action.id]: action.count };
}

function App() {
  const [counts, setCount] = useReducer(countsReducer, INITIAL_COUNTS);
  const [future, setFuture] = useState(false);
  const [view, setView] = useState('light');
  // Once asked for, the chart stays available. Someone who reasons forward
  // should not have to get stuck a second time to see it again.
  const [chartUnlocked, setChartUnlocked] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [dancing, setDancing] = useState(false);

  const demand = future ? DEMAND_2030 : DEMAND_TODAY;
  const merged = useMemo(() => mergeCounts(EXISTING_FLEET_COUNTS, counts), [counts]);

  const delivered = useMemo(
    () => applySupply(BASE_CURVE, demand, merged),
    [demand, merged],
  );
  const available = useMemo(
    () => availableSupply(BASE_CURVE, demand, merged),
    [demand, merged],
  );

  const { hours, deficitGwh, worstGapMW, worstHour } = useMemo(
    () => shortfall(delivered, demand),
    [delivered, demand],
  );

  const addedGw = generationNameplate(counts);

  // Victory is always measured against the 2030 scenario, whichever view is on
  // screen. Today's grid already covers today's demand, so scoring the visible
  // scenario means you win by loading the page or by flipping the switch back.
  // Every hour of the hard day has to be covered, not the easy one.
  const challenge = useMemo(
    () => shortfall(applySupply(BASE_CURVE, DEMAND_2030, merged), DEMAND_2030),
    [merged],
  );
  const covered = challenge.hours === 0;

  const wasCovered = useRef(null);
  useEffect(() => {
    const first = wasCovered.current === null;
    const justCovered = covered && wasCovered.current === false;
    wasCovered.current = covered;

    // Editing supply back down un-wins it. Leaving a victory notice up over a
    // day that no longer holds would be the app contradicting itself.
    if (!covered) {
      setWinOpen(false);
      setDancing(false);
      return undefined;
    }

    if (first || !justCovered) return undefined;
    setWinOpen(true);
    setDancing(true);
    const timer = setTimeout(() => setDancing(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [covered]);

  const showChart = () => {
    setChartUnlocked(true);
    setView('chart');
  };

  return (
    <div className="App">
      <header className="app-title">
        <h1>Lets Power Texas!</h1>
        <p className="app-hook">
          Keep the light on. Scrub the clock through a whole day on today&rsquo;s Texas grid,
          then switch to the grid we are heading for &mdash; ERCOT&rsquo;s projected 2030 load,
          with population growth, electrification and new around-the-clock demand. Every source
          has a shape, so this is not only a question of how much you build. It is a question of
          when it shows up.
        </p>
      </header>

      <nav className="app-nav">
        <div className="app-tabs" role="tablist" aria-label="View">
          {[
            ['light', 'The room'],
            ['build', 'Build supply'],
            ...(chartUnlocked ? [['chart', 'The chart']] : []),
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className="app-tab"
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="scenario-switch"
          role="switch"
          aria-checked={future}
          onClick={() => setFuture((was) => !was)}
        >
          <span className="scenario-switch__track">
            <span className="scenario-switch__knob" />
          </span>
          <span>{future ? 'Projected 2030' : "Today's grid"}</span>
        </button>
      </nav>

      <div className="app-stage">
        {view === 'light' && <Lightswitch counts={counts} future={future} />}

        {view === 'build' && (
          <div className="app-card app-card--build">
            <SupplyForm
              counts={counts}
              onCountChange={(id, count) => setCount({ id, count })}
              onReset={() => setCount({ type: 'reset' })}
            />
            <FleetTable counts={counts} />
          </div>
        )}

        {view === 'chart' && (
          <div className="app-card">
            <StatusBar
              hours={hours}
              deficitGwh={deficitGwh}
              worstGapMW={worstGapMW}
              worstHour={worstHour}
            />
            <LoadChart
              baseline={toGw(demand)}
              comparison={toGw(available)}
              baselineLabel={future ? 'Projected 2030 demand' : 'August 2026 demand (P50)'}
              comparisonLabel={
                addedGw === 0
                  ? 'Available supply'
                  : `Available supply (+${addedGw} GW nameplate)`
              }
            />
          </div>
        )}
      </div>

      {!chartUnlocked && (
        <p className="app-stuck">
          <button type="button" className="app-stuck__button" onClick={showChart}>
            Stuck? Show me the chart
          </button>
        </p>
      )}

      <footer className="app-footer">
        <SourcesCard />
      </footer>

      {winOpen && (
        <WinAlert
          counts={counts}
          baselineGapMW={BASELINE_GAP_MW}
          dancing={dancing}
          onDismiss={() => setWinOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
