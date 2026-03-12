import { useEffect, useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function MySchedulePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  useEffect(() => {
    HorariosApi.mySchedule()
      .then((res) => setItems(res.data.body))
      .catch((error) => push(getErrorMessage(error), 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (!items.length) {
    return (
      <div className="rounded bg-white p-4 text-sm text-slate-600 shadow">
        No tienes horarios publicados por el momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((day) => (
        <div key={day._id} className="rounded bg-white p-3 shadow">
          <p className="font-medium">{new Date(day.date).toISOString().slice(0, 10)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {day.blocks.map((b, idx) => (
              <div
                key={idx}
                className="max-w-xs rounded px-2 py-1 text-xs text-white"
                style={{ backgroundColor: b.skill?.color || '#334155' }}
              >
                <p className="font-medium">{b.start}-{b.end} {b.skill?.name || 'Skill'}</p>
                <p className="mt-0.5 text-[11px] text-slate-100">
                  {b.skill?.descripcion?.trim() || 'Sin descripción disponible'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
