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
      <div className="card text-sm text-[#4a4a4a]">
        No tienes horarios publicados por el momento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((day) => (
        <div key={day._id} className="card p-4">
          <p className="font-semibold text-[#1f2937]">{new Date(day.date).toISOString().slice(0, 10)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {day.blocks.map((b, idx) => (
              <div
                key={idx}
                className="max-w-xs rounded-lg px-3 py-2 text-xs text-white"
                style={{ backgroundColor: b.skill?.color || '#835da2' }}
              >
                <p className="font-medium">{b.start}-{b.end} {b.skill?.name || 'Habilidad'}</p>
                <p className="mt-1 text-[11px] text-white/90">{b.skill?.descripcion?.trim() || 'Sin descripción disponible'}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
