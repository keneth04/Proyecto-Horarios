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
   <section className="space-y-6">
      <h2 className="panel-title">Publicar semana</h2>
      <div className="card flex flex-wrap gap-3 p-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={publish} className="btn-primary">Publicar</button>
      </div>
      {result && <pre className="card text-xs">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
