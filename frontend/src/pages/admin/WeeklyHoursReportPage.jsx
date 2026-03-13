import { useEffect, useMemo, useState } from 'react';
import { HorariosApi, UsersApi } from '../../api/endpoints';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

const MODES = [
  { value: 'published', label: 'Publicado' },
  { value: 'draft', label: 'Borrador' }
];

const formatWeek = (week) => {
  if (!week?.from || !week?.to) return '';

  const from = new Date(week.from).toISOString().slice(0, 10).replaceAll('-', '/');
  const to = new Date(week.to).toISOString().slice(0, 10).replaceAll('-', '/');
  return `${from} - ${to}`;
};

const formatHours = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';

  if (Number.isInteger(value)) return String(value);

  return value.toFixed(1).replace('.', ',');
};

export default function WeeklyHoursReportPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('published');
  const [campaign, setCampaign] = useState('');
  const [campaignOptions, setCampaignOptions] = useState([]);
  const [report, setReport] = useState({ agents: [], skillColumns: [], week: null });
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const loadCampaigns = async () => {
    try {
      const usersRes = await UsersApi.list();
      const users = usersRes?.data?.body || [];
      const campaigns = [...new Set(users.map((u) => String(u.campaign || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      setCampaignOptions(campaigns);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await HorariosApi.weeklyHoursReport({ date, mode, campaign });
      setReport(res?.data?.body || { agents: [], skillColumns: [], week: null });
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    loadReport();
  }, []);

  const columns = useMemo(() => report.skillColumns || [], [report.skillColumns]);

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Reporte semanal de horas por agente y skill</h2>

      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input list="campaign-options-weekly-hours" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Filtrar por campaña" />

        <datalist id="campaign-options-weekly-hours">
          {campaignOptions.map((option) => <option key={option} value={option} />)}
        </datalist>

        <button onClick={loadReport} className="btn-primary">Consultar</button>
      </div>

       <p className="text-sm text-[#4a4a4a]">Semana: {formatWeek(report.week)}</p>

      {loading ? <Spinner label="Cargando reporte..." /> : (
        <div className="overflow-x-auto rounded-xl border border-[#eef0f4] bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f9fb] text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4a4a4a]">Agente</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4a4a4a]">Campaña</th>
                {columns.map((column) => (
                   <th key={column} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4a4a4a]">{column}</th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4a4a4a]">Total (operativas)</th>
              </tr>
            </thead>

            <tbody>
              {(report.agents || []).length === 0 && (
                <tr>
                  <td colSpan={columns.length + 3} className="px-4 py-6 text-center text-[#6b7280]">Sin datos para los filtros seleccionados</td>
                </tr>
              )}

              {(report.agents || []).map((agent) => (
                <tr key={agent.userId} className="border-t border-[#eef0f4] transition hover:bg-[#f8f9fb]">
                  <td className="px-4 py-3">{agent.agentName}</td>
                  <td className="px-4 py-3">{agent.campaign || 'Sin campaña'}</td>
                  {columns.map((column) => (
                    <td key={`${agent.userId}-${column}`} className="px-4 py-3">{formatHours(agent.totalsBySkillHours?.[column] || 0)}</td>
                  ))}
                 <td className="px-4 py-3 font-semibold">{formatHours(agent.totalOperativeHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}