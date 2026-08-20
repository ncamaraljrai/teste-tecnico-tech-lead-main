import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const channels = ['Todos os canais', 'email', 'whatsapp', 'push', 'sms'];
const initialFilters = {
  from: '2025-01-01',
  to: '2025-12-31',
  channel: '',
  granularity: 'day'
};

function formatChannel(channel) {
  return channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'E-mail' : channel.toUpperCase();
}

function LineChart({ data }) {
  const width = 900;
  const height = 310;
  const series = [...new Set(data.map((item) => item.channel))].map((channel) => ({ channel, data: data.filter((item) => item.channel === channel) }));
  const max = Math.max(40, ...data.map((item) => Number(item.rate) || 0));
  const dates = [...new Set(data.map((item) => item.date))];
  const x = (date) => (dates.indexOf(date) / Math.max(dates.length - 1, 1)) * width;
  const y = (rate) => height - ((rate / max) * (height - 30) + 10);
  if (!data.length) return <div className="empty">Nenhum registro encontrado para este recorte.</div>;
  return <div className="chart-wrap">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução da taxa de conversão">
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} className="axis" />
      {[0, 1, 2, 3].map((step) => <line key={step} x1="0" x2={width} y1={height - step * 80 - 10} y2={height - step * 80 - 10} className="grid" />)}
      {series.map(({ channel, data: channelData }, seriesIndex) => <g key={channel}>
        <polyline points={channelData.map((item) => `${x(item.date)},${y(item.rate)}`).join(' ')} className={`line line-${seriesIndex % 4}`} />
        {channelData.filter((_item, index) => index % Math.max(1, Math.ceil(channelData.length / 8)) === 0).map((item) => <circle key={`${channel}-${item.date}`} cx={x(item.date)} cy={y(item.rate)} r="4" className={`dot dot-${seriesIndex % 4}`} />)}
      </g>)}
    </svg>
    <div className="chart-labels"><span>{dates[0]}</span><span>{dates[Math.floor(dates.length / 2)]}</span><span>{dates[dates.length - 1]}</span></div>
    <div className="chart-legend">{series.map(({ channel }, index) => <span key={channel}><i className={`legend-${index % 4}`} />{formatChannel(channel)}</span>)}</div>
  </div>;
}

function App() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [result, setResult] = useState({ data: [], loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ from: applied.from, to: applied.to, granularity: applied.granularity });
    if (applied.channel) params.set('channel', applied.channel);
    setResult((current) => ({ ...current, loading: true, error: '' }));
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/conversion-evolution?${params}`)
      .then((response) => response.ok ? response.json() : response.json().then((body) => Promise.reject(new Error(body.error))))
      .then((body) => setResult({ data: body.data, loading: false, error: '' }))
      .catch((error) => setResult({ data: [], loading: false, error: error.message }));
  }, [applied, reloadKey]);

  const data = result.data;
  const total = data.reduce((sum, item) => sum + Number(item.total), 0);
  const converted = data.reduce((sum, item) => sum + Number(item.converted), 0);
  const rate = total ? ((converted / total) * 100).toFixed(1) : '0.0';
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">P</span><span>pulse<span className="brand-dot">.</span></span></div><span className="live"><i /> dados em tempo real</span></header>
    <section className="intro"><div><p className="eyebrow">performance / canais</p><h1>Evolução de conversão</h1><p className="subtitle">Acompanhe a eficiência de cada canal ao longo do tempo.</p></div><div className="period-tag">{applied.from} <span>→</span> {applied.to}</div></section>
    <section className="filters" aria-label="Filtros da análise">
      <label>Período inicial<input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} /></label>
      <label>Período final<input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} /></label>
      <label>Canal<select value={filters.channel} onChange={(event) => setFilter('channel', event.target.value)}>{channels.map((channel) => <option key={channel} value={channel === 'Todos os canais' ? '' : channel}>{channel === 'Todos os canais' ? channel : formatChannel(channel)}</option>)}</select></label>
      <label>Granularidade<select value={filters.granularity} onChange={(event) => setFilter('granularity', event.target.value)}><option value="day">Diária</option><option value="week">Semanal</option><option value="month">Mensal</option></select></label>
      <button onClick={() => setApplied(filters)}>Atualizar dados <span>↗</span></button>
      <button className="secondary-button" onClick={() => { setFilters(initialFilters); setApplied(initialFilters); }}>Limpar</button>
    </section>
    {result.error && <div className="error">{result.error}<button onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</button></div>}
    <section className="metrics"><article><span>Taxa média</span><strong>{rate}<small>%</small></strong><em>no período selecionado</em></article><article><span>Conversões</span><strong>{converted.toLocaleString('pt-BR')}</strong><em>status válido (1)</em></article><article><span>Total de envios</span><strong>{total.toLocaleString('pt-BR')}</strong><em>todos os status</em></article></section>
    <section className="panel"><div className="panel-head"><div><p className="eyebrow">visão temporal</p><h2>Taxa de conversão</h2></div><span className="legend"><i /> conversão</span></div>{result.loading ? <div className="empty">Carregando dados...</div> : <LineChart data={data} />}</section>
    <footer><span>Pulse analytics</span><span>Conversão = status válido / total de envios</span></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);