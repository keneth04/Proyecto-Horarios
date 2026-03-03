import { useEffect, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';

export default function EditPublishedWeekPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [userId, setUserId] = useState('');
  const [week, setWeek] = useState([]);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([UsersApi.list(), SkillsApi.list()]).then(([u, s]) => {
      const agents = u.data.body.filter((item) => item.role === 'agente');
      setUsers(agents);
      setUserId(agents[0]?._id || '');
      setSkills(s.data.body.filter((skill) => skill.status === 'active'));
    }).catch((error) => push(getErrorMessage(error), 'error'));
  }, []);

  const load = async () => {
    try {
      const res = await HorariosApi.weekByUser({ userId, date });
      const schedules = res.data.body.schedules.map((day) => ({
        id: day._id,
        date: new Date(day.date).toISOString().slice(0, 10),
        blocks: day.blocks.map((b) => ({ start: b.start, end: b.end, skillId: b.skill?._id || '' }))
      }));
      setWeek(schedules);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const updateBlock = (dayIndex, blockIndex, field, value) => {
    setWeek((prev) => prev.map((d, i) => i !== dayIndex ? d : {
      ...d,
      blocks: d.blocks.map((b, bi) => bi !== blockIndex ? b : { ...b, [field]: value })
    }));
  };

  const save = async () => {
    for (const day of week) {
      for (const block of day.blocks) {
        if (!isValidHour(block.start) || !isValidHour(block.end) || block.end <= block.start) {
          push('Bloques inválidos en editor', 'error');
          return;
        }
      }
    }

    try {
      await HorariosApi.editWeek({ userId, date, schedules: week });
      push('Semana editada');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Editar semana publicada</h2>
      <div className="flex gap-2">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded border px-2 py-1">{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <button onClick={load} className="rounded border px-3 py-2">Cargar</button>
        <button onClick={save} className="rounded bg-slate-900 px-3 py-2 text-white">Guardar</button>
      </div>
      <div className="space-y-2">
        {week.map((day, dayIdx) => (
          <div key={day.id} className="rounded bg-white p-3 shadow">
            <p className="mb-2 font-medium">{day.date}</p>
            {day.blocks.map((block, blockIdx) => (
              <div key={blockIdx} className="mb-1 grid grid-cols-3 gap-2">
                <input value={block.start} onChange={(e) => updateBlock(dayIdx, blockIdx, 'start', e.target.value)} className="rounded border px-2 py-1" />
                <input value={block.end} onChange={(e) => updateBlock(dayIdx, blockIdx, 'end', e.target.value)} className="rounded border px-2 py-1" />
                <select value={block.skillId} onChange={(e) => updateBlock(dayIdx, blockIdx, 'skillId', e.target.value)} className="rounded border px-2 py-1">
                  <option value="">Skill</option>
                  {skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
