import { useEffect, useMemo, useState } from 'react';
import { HorariosApi, SkillsApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage, isValidHour } from '../../utils/helpers';

const EMPTY_BLOCK = { start: '08:00', end: '09:00', skillId: '' };
const EMPTY_FORM = {
  code: '',
  name: '',
  blocks: [{ ...EMPTY_BLOCK }]
};

export default function ShiftTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const { push } = useToast();

  const skillsMap = useMemo(() => skills.reduce((acc, skill) => {
    acc[String(skill._id)] = skill;
    return acc;
  }, {}), [skills]);

  const load = async () => {
    try {
      const [templatesRes, skillsRes] = await Promise.all([
        HorariosApi.shiftTemplates(),
        SkillsApi.list()
      ]);

      setTemplates(templatesRes?.data?.body || []);
      setSkills((skillsRes?.data?.body || []).filter((skill) => skill.status === 'active'));
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setBlock = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, blockIndex) => (
        blockIndex === index ? { ...block, [field]: value } : block
      ))
    }));
  };

  const addBlock = () => {
    setForm((prev) => ({ ...prev, blocks: [...prev.blocks, { ...EMPTY_BLOCK }] }));
  };

  const removeBlock = (index) => {
    setForm((prev) => {
      if (prev.blocks.length === 1) {
        push('Debe existir al menos un bloque', 'error');
        return prev;
      }

      return {
        ...prev,
        blocks: prev.blocks.filter((_, blockIndex) => blockIndex !== index)
      };
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };

  const validateForm = () => {
    if (!form.code.trim()) {
      return 'El código del turno tipo es obligatorio (ej. A, B o C)';
    }

    for (let index = 0; index < form.blocks.length; index += 1) {
      const block = form.blocks[index];
      const label = `Bloque ${index + 1}`;

      if (!block.start || !block.end || !block.skillId) {
        return `${label}: faltan datos obligatorios`;
      }

      if (!isValidHour(block.start) || !isValidHour(block.end)) {
        return `${label}: la hora debe tener formato HH:mm`;
      }

      if (block.end <= block.start) {
        return `${label}: end debe ser mayor que start`;
      }
    }

    return null;
  };

  const save = async () => {
    const validationError = validateForm();
    if (validationError) {
      push(validationError, 'error');
      return;
    }

    try {
      const payload = {
        code: form.code,
        name: form.name,
        blocks: form.blocks
      };

      if (editingId) {
        await HorariosApi.updateShiftTemplate(editingId, payload);
        push('Turno tipo actualizado');
      } else {
        await HorariosApi.createShiftTemplate(payload);
        push('Turno tipo creado');
      }

      resetForm();
      await load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const edit = (template) => {
    setEditingId(template._id);
    setForm({
      code: template.code || '',
      name: template.name || '',
      blocks: (template.blocks || []).map((block) => ({
        start: block.start,
        end: block.end,
        skillId: block.skill?._id || ''
      }))
    });
  };

  const toggleStatus = async (template) => {
    try {
      await HorariosApi.updateShiftTemplate(template._id, {
        status: template.status === 'active' ? 'inactive' : 'active'
      });
      push('Estado actualizado');
      await load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="panel-title">Turnos reutilizables</h2>

      <div className="card space-y-3 p-4">
        <p className="text-sm text-[#5e536d]">Define plantillas (A, B, C...) que representan un día completo de bloques. Esta configuración no asigna agentes aún.</p>

        <div className="grid gap-3 md:grid-cols-2">
          <input placeholder="Código (A, B, C...)" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <input placeholder="Nombre opcional" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        </div>

        {form.blocks.map((block, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input value={block.start} onChange={(event) => setBlock(index, 'start', event.target.value)} />
            <input value={block.end} onChange={(event) => setBlock(index, 'end', event.target.value)} />
            <select value={block.skillId} onChange={(event) => setBlock(index, 'skillId', event.target.value)}>
              <option value="">Habilidad</option>
              {skills.map((skill) => <option key={skill._id} value={skill._id}>{skill.name}</option>)}
            </select>
            <button onClick={() => removeBlock(index)} className="btn-danger">Eliminar</button>
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <button onClick={addBlock} className="btn-secondary">Agregar bloque</button>
          <button onClick={save} className="btn-primary">{editingId ? 'Guardar cambios' : 'Crear turno tipo'}</button>
          {editingId && <button onClick={resetForm} className="btn-secondary">Cancelar edición</button>}
        </div>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template._id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-[#1f2937]">
                {template.code}
                {template.name ? ` - ${template.name}` : ''}
                {' · '}
                <span className={template.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>
                  {template.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </p>

              <div className="flex gap-2">
                <button onClick={() => edit(template)} className="btn-secondary">Editar</button>
                <button onClick={() => toggleStatus(template)} className="btn-secondary">
                  {template.status === 'active' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-[#6b7280]">Horas operativas: {template.operativeHours}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {(template.blocks || []).map((block, index) => {
                const skill = block.skill || skillsMap[String(block.skillId)] || null;
                return (
                  <span key={index} className="rounded-lg px-3 py-1 text-xs text-white" style={{ backgroundColor: skill?.color || '#835da2' }}>
                    {block.start}-{block.end} {skill?.name || 'Habilidad'}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}