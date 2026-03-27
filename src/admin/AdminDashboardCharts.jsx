import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BOOKING_OVERVIEW_SERIES, SALES_REPORT_DATA } from './adminDashboardData'

const fmtMoney = (v) =>
  typeof v === 'number'
    ? `₱${v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : v}`
    : v

export function BookingOverviewChart() {
  return (
    <div className="admin-dash__chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={BOOKING_OVERVIEW_SERIES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ebe6dc" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6a645c' }} axisLine={{ stroke: '#ddd' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6a645c' }} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #ebe6dc',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="approved" name="Approved" stroke="#2e7d32" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="pending" name="Pending" stroke="#f9a825" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="cancelled" name="Cancelled / Rejected" stroke="#c62828" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SalesReportChart() {
  return (
    <div className="admin-dash__chart-wrap admin-dash__chart-wrap--tall">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={SALES_REPORT_DATA} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ebe6dc" />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6a645c' }} />
          <YAxis tickFormatter={(v) => fmtMoney(v)} tick={{ fontSize: 11, fill: '#6a645c' }} width={56} />
          <Tooltip
            formatter={(value) => [`₱${Number(value).toLocaleString()}`, '']}
            contentStyle={{ borderRadius: 10, border: '1px solid #ebe6dc' }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="roomRevenue" name="Room Revenue" fill="#1976d2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="posSales" name="POS Sales" fill="#43a047" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="totalSales"
            name="Total Sales"
            stroke="#2e7d32"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2e7d32' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
