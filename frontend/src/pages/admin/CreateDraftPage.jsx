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
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkEndDate, setBulkEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkCampaign, setBulkCampaign] = useState('all');
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState([]);
  const [overwriteDraft, setOverwriteDraft] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [blocks, setBlocks] = useState([{ ...emptyBlock }]);
  const { push } = useToast();

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id) === String(userId)) || null,
    [users, userId]
  );

  const availableSkills = useMemo(() => (
    getAllowedSkillsForUser({ skills, user: selectedUser })
  ), [skills, selectedUser]);

  const campaignOptions = useMemo(() => {
    const values = [...new Set(users.map((user) => (user.campaign || '').trim()).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b, 'es'));
  }, [users]);

  const filteredBulkUsers = useMemo(() => {
    const normalizedSearch = bulkSearch.trim().toLowerCase();

    return users.filter((user) => {
      const campaignMatch = bulkCampaign === 'all' || (user.campaign || '') === bulkCampaign;
      if (!campaignMatch) return false;
      if (!normalizedSearch) return true;

      const searchTarget = `${user.name || ''} ${user.email || ''}`.toLowerCase();
      return searchTarget.includes(normalizedSearch);
    });
  }, [users, bulkSearch, bulkCampaign]);

  const allFilteredSelected = useMemo(() => (
    filteredBulkUsers.length > 0
    && filteredBulkUsers.every((user) => bulkSelectedUserIds.includes(String(user._id)))
  ), [filteredBulkUsers, bulkSelectedUserIds]);

  useEffect(() => {
    Promise.all([UsersApi.list(), SkillsApi.list(), HorariosApi.shiftTemplates()]).then(([u, s, t]) => {
      const activeUsers = u.data.body.filter((user) => user.status === 'active' && user.role === 'agente');
      setUsers(activeUsers);
      setUserId(activeUsers[0]?._id || '');
      setBulkSelectedUserIds(activeUsers.map((user) => String(user._id)));
      setSkills(s.data.body.filter((skill) => skill.status === 'active'));
      const activeTemplates = (t?.data?.body || []).filter((template) => template.status === 'active');
      setTemplates(activeTemplates);
      setBulkTemplateId(activeTemplates[0]?._id || '');
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

  const toggleBulkUser = (selectedUserId) => {
    setBulkSelectedUserIds((prev) => (
      prev.includes(selectedUserId)
        ? prev.filter((id) => id !== selectedUserId)
        : [...prev, selectedUserId]
    ));
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredBulkUsers.map((user) => String(user._id));
    setBulkSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }

      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const runBulkAssignment = async () => {
    if (!bulkTemplateId) {
      push('Selecciona un turno tipo para la asignación masiva', 'error');
      return;
    }

    if (bulkSelectedUserIds.length === 0) {
      push('Selecciona al menos un agente', 'error');
      return;
    }

    if (!bulkStartDate || !bulkEndDate) {
      push('Debes seleccionar fecha inicio y fecha fin', 'error');
      return;
    }

    if (bulkEndDate < bulkStartDate) {
      push('La fecha fin no puede ser menor que la fecha inicio', 'error');
      return;
    }

    try {
      const response = await HorariosApi.bulkAssignShiftTemplate({
        templateId: bulkTemplateId,
        userIds: bulkSelectedUserIds,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        overwriteDraft
      });

      const result = response?.data?.body || null;
      setBulkResult(result);

      if (!result) {
        push('Asignación masiva completada');
        return;
      }

      const summary = `Asignación masiva lista: ${result.insertedCount || 0} creados, ${result.updatedCount || 0} actualizados, ${result.conflictCount || 0} conflictos.`;
      push(summary, result.conflictCount ? 'warning' : 'success');
    } catch (error) {
      setBulkResult(null);
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Crear horario borrador</h2>
      <div className="card space-y-4 p-4">
        <div>
          <h3 className="text-base font-bold text-[#2b2139]">Asignación masiva de turnos de tipo A, B, C...</h3>
          <p className="text-sm text-[#5e536d]">Aplica un turno tipo a múltiples agentes y un rango de fechas. Si ya existe un horario, el sistema reporta conflicto o lo reemplaza solo si activas sobrescribir borrador.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <select value={bulkTemplateId} onChange={(e) => setBulkTemplateId(e.target.value)}>
            <option value="">Selecciona turno tipo</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.code}{template.name ? ` - ${template.name}` : ''}
              </option>
            ))}
          </select>
          <input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
          <input type="date" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
          <label className="flex items-center gap-2 rounded-lg border border-[#e6deef] bg-white px-3 py-2 text-sm text-[#2b2139]">
            <input type="checkbox" checked={overwriteDraft} onChange={(e) => setOverwriteDraft(e.target.checked)} />
            Sobrescribir borradores existentes
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={bulkSearch}
            onChange={(e) => setBulkSearch(e.target.value)}
            placeholder="Buscar agente por nombre o correo"
          />
          <select value={bulkCampaign} onChange={(e) => setBulkCampaign(e.target.value)}>
            <option value="all">Todas las campañas</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
          <button onClick={toggleSelectAllFiltered} className="btn-secondary">
            {allFilteredSelected ? 'Deseleccionar filtrados' : 'Seleccionar filtrados'}
          </button>
        </div>

        <div className="max-h-64 overflow-auto rounded-xl border border-[#e6deef]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8f5fc]">
              <tr>
                <th className="px-3 py-2 text-left">Sel.</th>
                <th className="px-3 py-2 text-left">Agente</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Campaña</th>
              </tr>
            </thead>
            <tbody>
              {filteredBulkUsers.map((user) => {
                const checked = bulkSelectedUserIds.includes(String(user._id));
                return (
                  <tr key={user._id} className="border-t border-[#efe8f6]">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleBulkUser(String(user._id))} />
                    </td>
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">{user.campaign || '-'}</td>
                  </tr>
                );
              })}
              {filteredBulkUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-[#6b7280]">No hay agentes para los filtros seleccionados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#5e536d]">Agentes seleccionados: <strong>{bulkSelectedUserIds.length}</strong></span>
          <button onClick={runBulkAssignment} className="btn-primary">Aplicar asignación masiva</button>
        </div>

        {bulkResult && (
          <div className="rounded-xl border border-[#e6deef] bg-[#fbf9ff] p-3 text-sm">
            <p className="font-semibold text-[#2b2139]">Resultado: {bulkResult.insertedCount} creados, {bulkResult.updatedCount} actualizados, {bulkResult.conflictCount} conflictos.</p>
            {!!bulkResult.conflicts?.length && (
              <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-[#5e536d]">
                {bulkResult.conflicts.map((conflict, index) => (
                  <li key={`${conflict.userId || 'na'}-${conflict.date || 'nodate'}-${index}`}>
                    [{conflict.type}] {conflict.userName || conflict.userId}: {conflict.date || 'sin fecha'} — {conflict.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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
