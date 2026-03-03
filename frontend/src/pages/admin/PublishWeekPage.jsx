import { useState } from 'react';
import { HorariosApi } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/helpers';

export default function PublishWeekPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const { push } = useToast();

  const publish = async () => {
    try {
      const res = await HorariosApi.publish(date);
      setResult(res.data.body);
      push(res.data.message);
    } catch (error) {
      push(getErrorMessage(error), 'error');
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Publicar semana</h2>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <button onClick={publish} className="rounded bg-slate-900 px-3 py-2 text-white">Publicar</button>
      </div>
      {result && <pre className="rounded bg-white p-3 text-xs shadow">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
