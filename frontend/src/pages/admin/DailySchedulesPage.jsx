import { useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function DailySchedulesPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState(['publicado', 'borrador']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await HorariosApi.byDay({ date, statuses });
      setData(res.data.body);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Horarios por día</h2>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <input value={statuses.join(',')} onChange={(e) => setStatuses(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} className="rounded border px-2 py-1" />
        <button onClick={load} className="rounded bg-slate-900 px-3 py-2 text-white">Buscar</button>
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {data.map((h) => (
            <div key={h._id} className="rounded bg-white p-3 shadow">
              <p className="font-medium">{h.user?.name} - {new Date(h.date).toISOString().slice(0, 10)} - {h.status}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {h.blocks.map((b, i) => (
                  <span key={i} className="rounded px-2 py-1 text-xs text-white" style={{ backgroundColor: b.skill?.color || '#334155' }}>
                    {b.start}-{b.end} {b.skill?.name || 'Skill'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
