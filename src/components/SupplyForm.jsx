import './SupplyForm.css';
import SupplyOptionRow from './SupplyOptionRow';
import { SUPPLY_OPTIONS } from '../data/supplyOptions';

function SupplyForm({ counts, onCountChange, onReset }) {
  const totalUnits = SUPPLY_OPTIONS.reduce((sum, option) => sum + (counts[option.id] ?? 0), 0);
  const totalGw =
    SUPPLY_OPTIONS.reduce(
      (sum, option) => sum + (counts[option.id] ?? 0) * option.mwPerUnit,
      0,
    ) / 1000;

  return (
    <form className="supply-form" onSubmit={(event) => event.preventDefault()}>
      <div className="supply-form__head">
        <h2 className="supply-form__heading">Add supply</h2>
        <button
          type="button"
          className="supply-form__reset"
          onClick={onReset}
          disabled={totalUnits === 0}
        >
          Reset
        </button>
      </div>

      {SUPPLY_OPTIONS.map((option) => (
        <SupplyOptionRow
          key={option.id}
          option={option}
          count={counts[option.id] ?? 0}
          onChange={(count) => onCountChange(option.id, count)}
        />
      ))}

      <p className="supply-form__readout" aria-live="polite">
        {totalUnits === 0
          ? 'No supply added yet.'
          : `${totalUnits} site${totalUnits === 1 ? '' : 's'}, ${totalGw.toFixed(1)} GW nameplate.`}
      </p>
    </form>
  );
}

export default SupplyForm;
