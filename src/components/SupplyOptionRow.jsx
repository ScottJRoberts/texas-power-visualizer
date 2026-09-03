import { MAX_PER_OPTION } from '../data/supplyOptions';

const clamp = (n) => Math.min(MAX_PER_OPTION, Math.max(0, n));

function SupplyOptionRow({ option, count, onChange }) {
  const step = (delta) => onChange(clamp(count + delta));

  const handleInput = (event) => {
    const parsed = Number.parseInt(event.target.value, 10);
    onChange(Number.isNaN(parsed) ? 0 : clamp(parsed));
  };

  const inputId = `supply-${option.id}`;

  return (
    <div className="supply-form__row">
      <div className="supply-form__meta">
        <label className="supply-form__label" htmlFor={inputId}>
          {option.label}
          <span className="supply-form__size">
            {option.mwPerUnit.toLocaleString()} MW each
          </span>
        </label>
        <span className="supply-form__hint">{option.hint}</span>
      </div>

      <div className="supply-form__stepper">
        <button
          type="button"
          className="supply-form__step"
          onClick={() => step(-1)}
          disabled={count <= 0}
          aria-label={`Remove one ${option.label}`}
        >
          &minus;
        </button>

        <input
          id={inputId}
          className="supply-form__input"
          type="number"
          inputMode="numeric"
          min="0"
          max={MAX_PER_OPTION}
          value={count}
          onChange={handleInput}
        />

        <button
          type="button"
          className="supply-form__step"
          onClick={() => step(1)}
          disabled={count >= MAX_PER_OPTION}
          aria-label={`Add one ${option.label}`}
        >
          +
        </button>

        <output className="supply-form__total" htmlFor={inputId}>
          {((count * option.mwPerUnit) / 1000).toFixed(1)} GW
        </output>
      </div>
    </div>
  );
}

export default SupplyOptionRow;
