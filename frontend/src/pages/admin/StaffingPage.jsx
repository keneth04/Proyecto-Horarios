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
        {!rows.length && (
          <p className="text-sm text-[#6b7280]">No hay datos de dotación para los filtros seleccionados.</p>
        )}
        {rows.map((row) => (
          <div key={row.hour} className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm [&:not(:last-child)]:mb-4">
            <p className="text-base font-semibold text-[#1f2937]">Franja: {row.hour}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {row.skills.map((skillRow, idx) => (
                <div key={idx} className="rounded-lg border border-[#eef0f4] bg-[#f8fafc] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{skillRow.skill?.name || 'Skill sin nombre'}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#374151]">
                      {skillRow.totalAgents} {skillRow.totalAgents === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[#6b7280]">Personas</p>
                  <ul className="mt-1 space-y-1 text-sm text-[#374151]">
                    {skillRow.agents?.length ? (
                      skillRow.agents.map((agent) => (
                        <li key={agent.id || agent.name} className="rounded bg-white px-2 py-1">
                          {agent.name}
                        </li>
                      ))
                    ) : (
                      <li className="rounded bg-white px-2 py-1 text-[#6b7280]">Sin asignación</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
