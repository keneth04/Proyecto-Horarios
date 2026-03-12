import { useEffect, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';

const EMPTY_BLOCK = { start: '08:00', end: '09:00', skillId: '' };

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

  const addBlock = (dayIndex) => {
    setWeek((prev) => prev.map((d, i) => i !== dayIndex ? d : {
      ...d,
      blocks: [...d.blocks, { ...EMPTY_BLOCK }]
    }));
  };

  const removeBlock = (dayIndex, blockIndex) => {
    setWeek((prev) => prev.map((d, i) => {
      if (i !== dayIndex) return d;

      return {
        ...d,
        blocks: d.blocks.filter((_, bi) => bi !== blockIndex)
      };
    }));
  };

  const validateWeek = () => {
    if (!week.length) {
      return 'Debe cargar una semana antes de guardar';
    }

    for (let dayIndex = 0; dayIndex < week.length; dayIndex += 1) {
      const day = week[dayIndex];

      if (!Array.isArray(day.blocks) || day.blocks.length === 0) {
        return `Día ${day.date}: debe existir al menos un bloque`;
      }

      for (let blockIndex = 0; blockIndex < day.blocks.length; blockIndex += 1) {
        const block = day.blocks[blockIndex];
        const blockLabel = `Día ${day.date}, bloque ${blockIndex + 1}`;

        if (!block.start || !block.end || !block.skillId) {
          return `${blockLabel}: faltan datos obligatorios (inicio, fin o skill)`;
        }

        if (!isValidHour(block.start)) {
          return `${blockLabel}: la hora de inicio debe tener formato HH:mm`;
        }

        if (!isValidHour(block.end)) {
          return `${blockLabel}: la hora de fin debe tener formato HH:mm`;
        }

        if (block.end <= block.start) {
          return `${blockLabel}: la hora fin debe ser mayor a la hora inicio`;
        }
      }
    }

    return null;
  };

  const save = async () => {
    const validationError = validateWeek();

    if (validationError) {
      push(validationError, 'error');
      return;
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
              <div key={blockIdx} className="mb-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input value={block.start} onChange={(e) => updateBlock(dayIdx, blockIdx, 'start', e.target.value)} className="rounded border px-2 py-1" />
                <input value={block.end} onChange={(e) => updateBlock(dayIdx, blockIdx, 'end', e.target.value)} className="rounded border px-2 py-1" />
                <select value={block.skillId} onChange={(e) => updateBlock(dayIdx, blockIdx, 'skillId', e.target.value)} className="rounded border px-2 py-1">
                  <option value="">Skill</option>
                  {skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <button
                  onClick={() => removeBlock(dayIdx, blockIdx)}
                  className="rounded border border-red-300 px-2 py-1 text-red-600"
                >
                  Eliminar bloque
                </button>
              </div>
            ))}
            <button onClick={() => addBlock(dayIdx)} className="mt-2 rounded border px-3 py-1">
              Agregar bloque
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
