import { useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function StaffingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const { push } = useToast();

  const load = async () => {
    try {
      const res = await HorariosApi.staffingByDay({ date, statuses: ['publicado'] });
      setRows(res.data.body.rows);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Dotación por día</h2>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <button onClick={load} className="rounded bg-slate-900 px-3 py-2 text-white">Consultar</button>
      </div>
      <div className="rounded bg-white p-3 shadow">
        {rows.map((row) => (
          <div key={row.hour} className="border-b py-2">
            <p className="font-medium">{row.hour}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {row.skills.map((s, idx) => <span key={idx} className="rounded border px-2 py-1">{s.skill?.name}: {s.totalAgents}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
