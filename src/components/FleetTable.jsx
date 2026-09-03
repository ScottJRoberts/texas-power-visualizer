import './FleetTable.css';
import { PLANT } from '../data/plantScale';
import { SUPPLY_OPTIONS } from '../data/supplyOptions';

// What Texas has today plus what you have built. Existing figures are the
// ERCOT August 2026 registry; the added column is this session only.
function FleetTable({ counts }) {
  const rows = SUPPLY_OPTIONS.map((option) => {
    const plant = PLANT[option.plantKey];
    const added = counts[option.id] ?? 0;
    return {
      id: option.id,
      label: `${plant.label}s`,
      existingSites: plant.sitesInTexas,
      existingGw: plant.fleetGW,
      added,
      totalSites: plant.sitesInTexas + added,
      totalGw: plant.fleetGW + (added * option.mwPerUnit) / 1000,
      perSiteMW: option.mwPerUnit,
    };
  });

  const totals = rows.reduce(
    (sum, row) => ({
      existingSites: sum.existingSites + row.existingSites,
      added: sum.added + row.added,
      totalSites: sum.totalSites + row.totalSites,
      existingGw: sum.existingGw + row.existingGw,
      totalGw: sum.totalGw + row.totalGw,
    }),
    { existingSites: 0, added: 0, totalSites: 0, existingGw: 0, totalGw: 0 },
  );

  return (
    <section className="fleet">
      <h2 className="fleet__heading">
        Texas fleet
        <span className="fleet__note">ERCOT registry, plus what you built</span>
      </h2>

      <div className="fleet__scroll">
        <table className="fleet__table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Per site</th>
              <th scope="col">Existing</th>
              <th scope="col">Added</th>
              <th scope="col">Total sites</th>
              <th scope="col">Existing GW</th>
              <th scope="col">Total GW</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.added > 0 ? 'is-changed' : undefined}>
                <th scope="row">{row.label}</th>
                <td className="fleet__muted">{row.perSiteMW.toLocaleString()} MW</td>
                <td>{row.existingSites.toLocaleString()}</td>
                <td className="fleet__added">
                  {row.added > 0 ? `+${row.added.toLocaleString()}` : '—'}
                </td>
                <td>{row.totalSites.toLocaleString()}</td>
                <td className="fleet__muted">{row.existingGw.toFixed(1)}</td>
                <td className="fleet__strong">{row.totalGw.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">All</th>
              <td />
              <td>{totals.existingSites.toLocaleString()}</td>
              <td className="fleet__added">
                {totals.added > 0 ? `+${totals.added.toLocaleString()}` : '—'}
              </td>
              <td>{totals.totalSites.toLocaleString()}</td>
              <td className="fleet__muted">{totals.existingGw.toFixed(1)}</td>
              <td className="fleet__strong">{totals.totalGw.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export default FleetTable;
