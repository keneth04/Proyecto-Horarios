import { useEffect, useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

const MODES = [
  { value: 'published', label: 'Publicado' },
  { value: 'draft', label: 'Borrador' }
];

export default function StaffingPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('published');
  const [campaign, setCampaign] = useState('');
  const [campaignOptions, setCampaignOptions] = useState([]);
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

  const load = async () => {
    try {
      const res = await HorariosApi.staffingByDay({ date, mode, campaign });
      setRows(res.data.body.rows || []);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Dotación por día</h2>
      <div className="flex flex-wrap gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded border px-2 py-1">
          {MODES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          list="campaign-options"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="Filtrar por campaña"
          className="rounded border px-2 py-1"
        />
        <datalist id="campaign-options">
          {campaignOptions.map((option) => <option key={option} value={option} />)}
        </datalist>

        <button onClick={load} className="rounded bg-slate-900 px-3 py-2 text-white">Consultar</button>
      </div>

      <div className="rounded bg-white p-3 shadow">
        {rows.map((row) => (
          <div key={row.hour} className="border-b py-2">
            <p className="font-medium">{row.hour}</p>
            <div className="space-y-2 text-sm">
              {row.skills.map((s, idx) => (
                <div key={idx} className="rounded border px-2 py-1">
                  <p>
                    {s.skill?.name}: {s.totalAgents}
                  </p>
                  <p className="text-xs text-slate-600">
                    Personas: {s.agents?.length ? s.agents.map((agent) => agent.name).join(', ') : 'Sin asignación'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
