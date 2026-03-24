import { useEffect, useMemo, useState } from 'react';
import { HorariosApi, SkillsApi, UsersApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';
import { getAllowedSkillsForUser } from '../../utils/skills';

const emptyBlock = { start: '08:00', end: '09:00', skillId: '' };

export default function CreateDraftPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [blocks, setBlocks] = useState([{ ...emptyBlock }]);
  const { push } = useToast();

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id) === String(userId)) || null,
    [users, userId]
  );

  const availableSkills = useMemo(() => (
    getAllowedSkillsForUser({ skills, user: selectedUser })
  ), [skills, selectedUser]);


  useEffect(() => {
    Promise.all([UsersApi.list(), SkillsApi.list(), HorariosApi.shiftTemplates()]).then(([u, s, t]) => {
      const activeUsers = u.data.body.filter((user) => user.status === 'active' && user.role === 'agente');
      setUsers(activeUsers);
      setUserId(activeUsers[0]?._id || '');
      setSkills(s.data.body.filter((skill) => skill.status === 'active'));
      setTemplates((t?.data?.body || []).filter((template) => template.status === 'active'));
    }).catch((error) => push(getErrorMessage(error), 'error'));
  }, []);

  useEffect(() => {
    const validSkillIds = new Set(availableSkills.map((skill) => String(skill._id)));

    setBlocks((prev) => prev.map((block) => {
      if (!block.skillId) return block;
      if (validSkillIds.has(String(block.skillId))) return block;

      return { ...block, skillId: '' };
    }));
  }, [availableSkills]);

  const setBlock = (idx, field, value) => setBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));

  const add = () => setBlocks((prev) => [...prev, { ...emptyBlock }]);

  const remove = (idx) => {
    setBlocks((prev) => {
      if (prev.length === 1) {
        push('Debe existir al menos un bloque', 'error');
        return prev;
      }

      return prev.filter((_, blockIndex) => blockIndex !== idx);
    });
  };

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

  const applyTemplate = () => {
    const template = templates.find((item) => String(item._id) === String(selectedTemplateId));

    if (!template) {
      push('Selecciona un turno tipo válido', 'error');
      return;
    }

    const nextBlocks = (template.blocks || []).map((block) => ({
      start: block.start,
      end: block.end,
      skillId: block.skill?._id || ''
    }));

    if (!nextBlocks.length) {
      push('El turno tipo seleccionado no tiene bloques', 'error');
      return;
    }

    setBlocks(nextBlocks);
    push(`Turno tipo ${template.code} aplicado`);
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Crear horario borrador</h2>
      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={userId} onChange={(e) => setUserId(e.target.value)}>{users.map((u) => <option value={u._id} key={u._id}>{u.name}</option>)}</select>
        <div className="flex gap-2">
          <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            <option value="">Turno tipo (opcional)</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.code}{template.name ? ` - ${template.name}` : ''}
              </option>
            ))}
          </select>
          <button onClick={applyTemplate} className="btn-secondary">Aplicar</button>
        </div>
      </div>
      {blocks.map((block, idx) => (
        <div key={idx} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input value={block.start} onChange={(e) => setBlock(idx, 'start', e.target.value)} />
          <input value={block.end} onChange={(e) => setBlock(idx, 'end', e.target.value)} />
          <select value={block.skillId} disabled={!selectedUser} onChange={(e) => setBlock(idx, 'skillId', e.target.value)}>
            <option value="">{selectedUser ? 'Habilidad' : 'Selecciona un agente primero'}</option>
            {availableSkills.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button onClick={() => remove(idx)} className="btn-danger">Eliminar bloque</button>
        </div>
      ))}
      <div className="flex gap-3">
        <button onClick={add} className="btn-secondary">Agregar bloque</button>
        <button onClick={save} className="btn-primary">Guardar borrador</button>
      </div>
    </section>
  );
}
