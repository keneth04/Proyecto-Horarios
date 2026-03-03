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

  return (
    <div className="space-y-3">
      {items.map((day) => (
        <div key={day._id} className="rounded bg-white p-3 shadow">
          <p className="font-medium">{new Date(day.date).toISOString().slice(0, 10)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {day.blocks.map((b, idx) => (
              <span key={idx} className="rounded px-2 py-1 text-xs text-white" style={{ backgroundColor: b.skill?.color || '#334155' }}>
                {b.start}-{b.end} {b.skill?.name || 'Skill'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
