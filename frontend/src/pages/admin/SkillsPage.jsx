import { useEffect, useState } from 'react';
import { SkillsApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', color: '#1e40af', descripcion: '' });
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
      push('Skill creada');
      setForm({ name: '', color: '#1e40af', descripcion: '' });
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
      <h2 className="text-xl font-semibold">Skills</h2>
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
            { key: 'type', label: 'Tipo' },
            { key: 'status', label: 'Estado' },
            { key: 'color', label: 'Color', render: (row) => <span className="rounded px-2 py-1 text-white" style={{ backgroundColor: row.color }}>{row.color}</span> },
            { key: 'actions', label: 'Acciones', render: (row) => <button onClick={() => toggle(row)} className="rounded border px-2 py-1">Cambiar estado</button> }
          ]}
          rows={skills}
        />
      )}
    </section>
  );
}
