import { useMemo, useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/Spinner';

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const toUtcDateKey = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatHours = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.0';
  return value.toFixed(1);
};

export default function PublishWeekPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState({ rows: [], week: null });
  const { push } = useToast();

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        HorariosApi.dailyOperativeHoursReport({ date, mode: 'draft' }),
        HorariosApi.weeklyHoursReport({ date, mode: 'draft' })
      ]);

      const dailyRows = dailyRes?.data?.body?.rows || [];
      const weeklyAgents = weeklyRes?.data?.body?.agents || [];
      const week = dailyRes?.data?.body?.week || weeklyRes?.data?.body?.week || null;

      const byAgent = new Map();
      for (const agent of weeklyAgents) {
        const userId = String(agent.userId);
        byAgent.set(userId, {
          userId,
          agentName: agent.agentName || 'Sin nombre',
          dailyHours: Array(7).fill(0),
          weeklyHours: Number(agent.totalOperativeHours || 0)
        });
      }

      const weekStart = week?.from ? new Date(week.from) : null;
      for (const row of dailyRows) {
        const agentName = row.agentName || 'Sin nombre';
        const rowDate = toUtcDateKey(row.date);
        if (!rowDate || !weekStart || Number.isNaN(weekStart.getTime())) continue;

        const dayIndex = Math.floor((new Date(`${rowDate}T00:00:00.000Z`) - weekStart) / (24 * 60 * 60 * 1000));
        if (dayIndex < 0 || dayIndex > 6) continue;

        const key = String(row.userId || `${agentName}-${rowDate}`);
        if (!byAgent.has(key)) {
          byAgent.set(key, {
            userId: key,
            agentName,
            dailyHours: Array(7).fill(0),
            weeklyHours: 0
          });
        }

        byAgent.get(key).dailyHours[dayIndex] += Number(row.operativeHours || 0);
      }

      const rows = [...byAgent.values()]
        .map((row) => ({
          ...row,
          weeklyHours: row.weeklyHours || Number((row.dailyHours.reduce((sum, value) => sum + value, 0)).toFixed(2))
        }))
        .sort((a, b) => a.agentName.localeCompare(b.agentName, 'es'));

      setPreview({ rows, week });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const publish = async () => {
    try {
      const res = await HorariosApi.publish(date);
      setResult(res.data.body);
      push(res.data.message);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const weekRangeLabel = useMemo(() => {
    if (!preview.week?.from || !preview.week?.to) return '';
    const from = toUtcDateKey(preview.week.from).replaceAll('-', '/');
    const to = toUtcDateKey(preview.week.to).replaceAll('-', '/');
    return `${from} - ${to}`;
  }, [preview.week]);

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Publicar semana</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={loadPreview} className="btn-secondary">Ver horas borrador</button>
        <button onClick={publish} className="btn-primary">Publicar</button>
      </div>
       <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#2b2139]">Horas operativas por agente antes de publicar</h3>
          {weekRangeLabel && <span className="text-sm text-[#5e536d]">Semana: {weekRangeLabel}</span>}
        </div>

        {loadingPreview ? <Spinner label="Calculando horas en borrador..." /> : (
          <div className="overflow-x-auto rounded-xl border border-[#eef0f4] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f9fb]">
                <tr>
                  <th className="px-3 py-2 text-left">Agente</th>
                  {WEEK_DAYS.map((day) => (
                    <th key={day} className="px-3 py-2 text-right">{day}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Total semana</th>
                </tr>
              </thead>
              <tbody>
                {!preview.rows.length && (
                  <tr>
                    <td colSpan={WEEK_DAYS.length + 2} className="px-3 py-4 text-center text-[#6b7280]">
                      Ejecuta "Ver horas borrador" para visualizar horas diarias y semanales antes de publicar.
                    </td>
                  </tr>
                )}

                {preview.rows.map((row) => (
                  <tr key={row.userId} className="border-t border-[#eef0f4]">
                    <td className="px-3 py-2">{row.agentName}</td>
                    {row.dailyHours.map((hours, index) => (
                      <td key={`${row.userId}-${index}`} className="px-3 py-2 text-right">{formatHours(hours)}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold">{formatHours(row.weeklyHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && <pre className="card text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
