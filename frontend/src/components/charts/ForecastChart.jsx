import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function ForecastChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid stroke="#2d3f55" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="timestamp" tick={{ fill: '#8892a4', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2d3f55' }} />
        <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: '#1e2d40', border: '1px solid #2d3f55', borderRadius: 8 }} />
        <Line dataKey="NR" stroke="#7c5cbf" strokeWidth={2} dot={false} />
        <Line dataKey="SR" stroke="#00d4aa" strokeWidth={2} dot={false} />
        <Line dataKey="WR" stroke="#f9ca24" strokeWidth={2} dot={false} />
        <Line dataKey="ER" stroke="#e74c3c" strokeWidth={2} dot={false} />
        <Line dataKey="NER" stroke="#4ecdc4" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
