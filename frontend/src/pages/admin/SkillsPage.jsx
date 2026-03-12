import { useEffect, useState } from 'react';
import { SkillsApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

const EMPTY_SKILL_FORM = { name: '', color: '#1e40af', descripcion: '' };

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_SKILL_FORM);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#1e40af', descripcion: '' });
  const { push } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await SkillsApi.list();
      setSkills(data.body);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await SkillsApi.create(form);
      push('Habilidad creada');
      setForm(EMPTY_SKILL_FORM);
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const openEdit = (skill) => {
    setEditingSkill(skill);
    setEditForm({
      name: skill.name || '',
      color: skill.color || '#1e40af',
      descripcion: skill.descripcion || ''
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingSkill(null);
    setEditForm({ name: '', color: '#1e40af' });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingSkill?._id) return;

    try {
      await SkillsApi.update(editingSkill._id, editForm);
      push('Habilidad actualizada');
      closeEdit();
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggle = async (skill) => {
    try {
      await SkillsApi.setStatus(skill._id, skill.status === 'active' ? 'inactive' : 'active');
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Habilidades</h2>
      <form onSubmit={submit} className="grid grid-cols-4 gap-2 rounded bg-white p-3 shadow">
        <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border px-2 py-1" />
        <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 rounded border px-2" />
        <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="rounded border px-2 py-1" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white">Crear</button>
      </form>
      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: 'name', label: 'Nombre' },
            {
              key: 'descripcion',
              label: 'Descripción',
              render: (row) => row.descripcion?.trim() || 'Sin descripción'
            },
            { key: 'type', label: 'Tipo' },
            { key: 'status', label: 'Estado' },
            { key: 'color', label: 'Color', render: (row) => <span className="rounded px-2 py-1 text-white" style={{ backgroundColor: row.color }}>{row.color}</span> },
            {
              key: 'actions',
              label: 'Acciones',
              render: (row) => (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(row)} className="rounded border px-2 py-1">Editar</button>
                  <button onClick={() => toggle(row)} className="rounded border px-2 py-1">Cambiar estado</button>
                </div>
              )
            }
          ]}
          rows={skills}
        />
      )}

      <Modal open={isEditOpen} title="Editar habilidad" onClose={closeEdit}>
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border px-2 py-1"
              placeholder="Nombre"
              value={editForm.name}
              disabled={editingSkill?.type === 'break' || editingSkill?.type === 'rest'}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              type="color"
              value={editForm.color}
              onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
              className="h-9 rounded border px-2"
            />
          </div>

          <input
            className="w-full rounded border px-2 py-1"
            placeholder="Descripción"
            value={editForm.descripcion}
            onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
          />

          {(editingSkill?.type === 'break' || editingSkill?.type === 'rest') && (
            <p className="text-sm text-slate-500">El nombre de skills BREAK/REST no se puede editar.</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEdit} className="rounded border px-3 py-2">Cancelar</button>
            <button className="rounded bg-slate-900 px-3 py-2 text-white">Guardar cambios</button>
          </div>
        </form>
      </Modal>

    </section>
  );
}
