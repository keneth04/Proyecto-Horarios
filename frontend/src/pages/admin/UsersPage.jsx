import { useEffect, useMemo, useState } from 'react';
import { SkillsApi, UsersApi } from '../../api/endpoints';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

const EMPTY_CREATE_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'agente',
  campaign: '',
  allowedSkills: []
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
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
      setForm(EMPTY_CREATE_FORM);
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

  const toggleEditSkill = (id) => {
    setEditForm((prev) => ({
      ...prev,
      allowedSkills: prev.allowedSkills.includes(id)
        ? prev.allowedSkills.filter((sid) => sid !== id)
        : [...prev.allowedSkills, id]
    }));
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'agente',
      campaign: user.campaign || '',
      allowedSkills: Array.isArray(user.allowedSkills)
        ? user.allowedSkills.map((skillId) => String(skillId))
        : []
    });
    setIsEditOpen(true);
  };


  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 'agente', campaign: '', allowedSkills: [] });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser?._id) return;

    try {
      await UsersApi.update(editingUser._id, editForm);
      push('Usuario actualizado');
      closeEdit();
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };


  const toggleStatus = async (user) => {
    try {
      await UsersApi.setStatus(user._id, user.status === 'active' ? 'inactive' : 'active');
      load();
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();

    return users.filter((user) => {
      const matchesName = !normalizedNameFilter
        || String(user.name || '').toLowerCase().includes(normalizedNameFilter);

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesName && matchesStatus;
    });
  }, [users, nameFilter, statusFilter]);

  const skillsById = useMemo(() => {
    return skills.reduce((acc, skill) => {
      acc[String(skill._id)] = skill;
      return acc;
    }, {});
  }, [skills]);

  const renderAllowedSkills = (user) => {
    const allowedSkills = Array.isArray(user.allowedSkills) ? user.allowedSkills : [];

    if (allowedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    const resolvedSkills = allowedSkills
      .map((skillId) => skillsById[String(skillId)])
      .filter(Boolean);

    if (resolvedSkills.length === 0) {
      return <span className="text-slate-500">Sin skills asignadas</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {resolvedSkills.map((skill) => (
          <span
            key={skill._id}
            className="rounded-full border px-2 py-0.5 text-xs text-slate-700"
          >
            {skill.name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>
      <form onSubmit={create} className="space-y-2 rounded bg-white p-3 shadow">

        <div className="grid gap-2 rounded bg-white p-3 shadow md:grid-cols-2">
        <input
            className="rounded border px-2 py-1"
            placeholder="Buscar por nombre"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <select
            className="rounded border px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <input className="rounded border px-2 py-1" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded border px-2 py-1" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded border px-2 py-1" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="rounded border px-2 py-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="agente">agente</option><option value="admin">admin</option></select>
          <input className="rounded border px-2 py-1" placeholder="Campaña" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
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
          { key: 'campaign', label: 'Campaña', render: (row) => row.campaign || 'Sin campaña' },
          { key: 'allowedSkills', label: 'Skills disponibles', render: renderAllowedSkills },
          { key: 'status', label: 'Estado' },
          {
            key: 'actions',
            label: 'Acciones',
            render: (row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="rounded border  bg-green-300 px-2 py-1">Editar</button>
                <button onClick={() => toggleStatus(row)} className="rounded border bg-red-300 px-2 py-1">Cambiar estado</button>
              </div>
            )
          }
        ]}
        rows={filteredUsers}
      />

      <Modal open={isEditOpen} title="Editar usuario" onClose={closeEdit}>
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border px-2 py-1"
              placeholder="Nombre"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              className="rounded border px-2 py-1"
              placeholder="Email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <select
              className="rounded border px-2 py-1"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              <option value="agente">agente</option>
              <option value="admin">admin</option>
            </select>
            <input
              className="rounded border px-2 py-1"
              placeholder="Campaña"
              value={editForm.campaign}
              onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <label key={skill._id} className="flex items-center gap-1 rounded border px-2 py-1">
                <input
                  type="checkbox"
                  checked={editForm.allowedSkills.includes(skill._id)}
                  onChange={() => toggleEditSkill(skill._id)}
                />
                {skill.name}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeEdit} className="rounded border px-3 py-2">Cancelar</button>
            <button className="rounded bg-slate-900 px-3 py-2 text-white">Guardar cambios</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
