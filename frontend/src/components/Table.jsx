export default function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#eef0f4] bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f8f9fb] text-left">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4a4a4a]">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-[#6b7280]">
                Sin datos
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={row.id || idx} className="border-t border-[#eef0f4] transition hover:bg-[#f8f9fb]">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 align-top">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
