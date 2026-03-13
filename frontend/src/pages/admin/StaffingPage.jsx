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
    <section className="space-y-6">
      <h2 className="panel-title">Dotación por día</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input list="campaign-options" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Filtrar por campaña" />
        <datalist id="campaign-options">
          {campaignOptions.map((option) => <option key={option} value={option} />)}
        </datalist>

        <button onClick={load} className="btn-primary">Consultar</button>
      </div>

      <div className="card p-4">
        {rows.map((row) => (
          <div key={row.hour} className="border-b border-[#eef0f4] py-3 last:border-none">
            <p className="font-semibold text-[#1f2937]">{row.hour}</p>
            <div className="mt-2 space-y-2 text-sm">
              {row.skills.map((s, idx) => (
                <div key={idx} className="rounded-lg border border-[#eef0f4] px-3 py-2">
                  <p>{s.skill?.name}: {s.totalAgents}</p>
                  <p className="text-xs text-[#6b7280]">Personas: {s.agents?.length ? s.agents.map((agent) => agent.name).join(', ') : 'Sin asignación'}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
