import { useEffect, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';

const emptyBlock = { start: '08:00', end: '09:00', skillId: '' };

export default function CreateDraftPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [blocks, setBlocks] = useState([{ ...emptyBlock }]);
  const { push } = useToast();

  useEffect(() => {
    Promise.all([UsersApi.list(), SkillsApi.list()]).then(([u, s]) => {
      const activeUsers = u.data.body.filter((user) => user.status === 'active' && user.role === 'agente');
      setUsers(activeUsers);
      setUserId(activeUsers[0]?._id || '');
      setSkills(s.data.body.filter((skill) => skill.status === 'active'));
    }).catch((error) => push(getErrorMessage(error), 'error'));
  }, []);

  const setBlock = (idx, field, value) => setBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));

  const add = () => setBlocks((prev) => [...prev, { ...emptyBlock }]);

  const save = async () => {
    for (const block of blocks) {
      if (!isValidHour(block.start) || !isValidHour(block.end) || block.end <= block.start) {
        push('Valida formato HH:mm y que end sea mayor a start', 'error');
        return;
      }
    }
    try {
      await HorariosApi.create({ userId, date, blocks });
      push('Borrador creado');
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Crear horario borrador</h2>
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded border px-2 py-1">{users.map((u) => <option value={u._id} key={u._id}>{u.name}</option>)}</select>
      </div>
      {blocks.map((block, idx) => (
        <div key={idx} className="grid grid-cols-3 gap-2">
          <input value={block.start} onChange={(e) => setBlock(idx, 'start', e.target.value)} className="rounded border px-2 py-1" />
          <input value={block.end} onChange={(e) => setBlock(idx, 'end', e.target.value)} className="rounded border px-2 py-1" />
          <select value={block.skillId} onChange={(e) => setBlock(idx, 'skillId', e.target.value)} className="rounded border px-2 py-1">
            <option value="">Skill</option>
            {skills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={add} className="rounded border px-3 py-2">Agregar bloque</button>
        <button onClick={save} className="rounded bg-slate-900 px-3 py-2 text-white">Guardar borrador</button>
      </div>
    </section>
  );
}
