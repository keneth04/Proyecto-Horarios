import { useEffect, useState } from 'react';
import { SkillsApi, UsersApi } from '../../api/endpoints';
import Table from '../../components/Table';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agente', allowedSkills: [] });
  const { push } = useToast();

  const load = async () => {
    try {
      const [usersRes, skillsRes] = await Promise.all([UsersApi.list(), SkillsApi.list()]);
      setUsers(usersRes.data.body);
      setSkills(skillsRes.data.body.filter((s) => s.status === 'active' && s.type !== 'break'));
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await UsersApi.create(form);
      push('Usuario creado');
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const toggleSkill = (id) => {
    setForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const toggleStatus = async (user) => {
    try {
      await UsersApi.setStatus(user._id, user.status === 'active' ? 'inactive' : 'active');
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>
      <form onSubmit={create} className="space-y-2 rounded bg-white p-3 shadow">
        <div className="grid grid-cols-4 gap-2">
          <input className="rounded border px-2 py-1" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded border px-2 py-1" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded border px-2 py-1" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="rounded border px-2 py-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="agente">agente</option><option value="admin">admin</option></select>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <label key={skill._id} className="flex items-center gap-1 rounded border px-2 py-1">
              <input type="checkbox" checked={form.allowedSkills.includes(skill._id)} onChange={() => toggleSkill(skill._id)} />
              {skill.name}
            </label>
          ))}
        </div>
        <button className="rounded bg-slate-900 px-3 py-2 text-white">Crear usuario</button>
      </form>

      <Table
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Rol' },
          { key: 'status', label: 'Estado' },
          { key: 'actions', label: 'Acciones', render: (row) => <button onClick={() => toggleStatus(row)} className="rounded border px-2 py-1">Cambiar estado</button> }
        ]}
        rows={users}
      />
    </section>
  );
}
