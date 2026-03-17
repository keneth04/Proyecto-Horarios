import { useEffect, useMemo, useState } from 'react';
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

  const groupedWeeks = useMemo(() => {
    const groups = [];
    const map = new Map();

    items.forEach((day) => {
      const dayIso = new Date(day.date).toISOString().slice(0, 10);
      const weekKey = dayIso;
      const parsed = new Date(`${weekKey}T00:00:00Z`);
      const weekday = parsed.getUTCDay();
      const diffToMonday = (weekday + 6) % 7;

      const from = new Date(parsed);
      from.setUTCDate(parsed.getUTCDate() - diffToMonday);
      const to = new Date(from);
      to.setUTCDate(from.getUTCDate() + 6);

      const fromLabel = from.toISOString().slice(0, 10);
      const toLabel = to.toISOString().slice(0, 10);
      const groupId = `${fromLabel}_${toLabel}`;

      if (!map.has(groupId)) {
        const group = { id: groupId, fromLabel, toLabel, days: [] };
        map.set(groupId, group);
        groups.push(group);
      }

      map.get(groupId).days.push(day);
    });

    groups.forEach((group) => {
      group.days.sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    groups.sort((a, b) => new Date(a.fromLabel) - new Date(b.fromLabel));
    return groups;
  }, [items]);

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
      {groupedWeeks.map((week) => (
        <div key={week.id} className="space-y-3">
          <div className="card p-3">
            <p className="text-sm font-semibold text-[#1f2937]">Semana {week.fromLabel} a {week.toLabel}</p>
          </div>
          {week.days.map((day) => (
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
      ))}
    </div>
  );
}
