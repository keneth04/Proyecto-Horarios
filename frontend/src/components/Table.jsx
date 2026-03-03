export default function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 font-medium text-slate-700">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-4 text-center text-slate-500">
                Sin datos
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={row.id || idx} className="border-t">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
