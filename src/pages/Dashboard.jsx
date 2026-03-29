import React, { useEffect, useMemo, useState } from 'react'

import { Link } from 'react-router-dom'

import StatusCard from '../components/status-card/StatusCard'
import Table from '../components/table/Table'
import Badge from '../components/badge/Badge'
import { fetchAllJobsForScope, fetchJobsByEmail } from '../lib/crmClient'

const DEV_VIEW_ALL_EMAILS = new Set(['pavel.sedlacek@derator.cz'])
const TECHNICI = [
    { id: '1', fullName: 'Tomáš Raška', email: 'tomas.raska@derator.cz' },
    { id: '1007', fullName: 'Pavel Sedláček', email: 'pavel.sedlacek@derator.cz' },
    { id: '1011', fullName: 'Filip Landovský', email: 'filip.landovsky@derator.cz' },
    { id: '1012', fullName: 'Libor Landovský', email: 'libor.landovsky@derator.cz' },
    { id: '1013', fullName: 'Jaromír Mareš', email: 'jaromir.mares@derator.cz' },
    { id: '1027', fullName: 'Petr Sedláček', email: 'petr.sedlacek@derator.cz' },
    { id: '1042', fullName: 'Radek Steppan', email: 'radek.steppan@derator.cz' },
    { id: '1044', fullName: 'Adam Duda', email: 'adam.duda@derator.cz' },
    { id: '1048', fullName: 'Vladimír Nedopil', email: 'vladimir.nedopil@derator.cz' },
    { id: '1050', fullName: 'Lukáš Franěk', email: 'lukas.franek@derator.cz' },
]

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()

const statusToBadge = {
    'otevrena': 'primary',
    'naplanovana': 'warning',
    'v-reseni': 'warning',
    'dokoncena': 'success'
}

const toMonthKey = (value) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const formatCzkInteger = (value) => {
    const n = Number(value)
    const rounded = Number.isFinite(n) ? Math.round(n) : 0
    return `${rounded.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kč`
}

const formatMonthYearCz = (date) => {
    return new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' }).format(date)
}

const Dashboard = ({ email }) => {
    const normalizedEmail = normalizeEmail(email)
    const canViewAll = DEV_VIEW_ALL_EMAILS.has(normalizedEmail)

    const [jobs, setJobs] = useState([])
    const [scope, setScope] = useState(canViewAll ? 'all' : 'mine')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setScope(canViewAll ? 'all' : 'mine')
    }, [canViewAll])

    useEffect(() => {
        let cancelled = false

        const run = async () => {
            if (!cancelled) {
                setLoading(true)
                setError('')
            }
            try {
                const wantsAll = canViewAll && scope === 'all'
                const list = wantsAll
                    ? await fetchAllJobsForScope({
                        emails: TECHNICI.map((item) => item.email),
                        currentUserEmail: email,
                    })
                    : await fetchJobsByEmail(email)
                if (!cancelled) {
                    setJobs(list)
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Načtení zakázek selhalo')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        run()

        return () => {
            cancelled = true
        }
    }, [email, canViewAll, scope])

    const stats = useMemo(() => {
        const now = new Date()
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

        const data = {
            thisMonthCount: 0,
            lastMonthCount: 0,
            thisMonthKm: 0,
            thisMonthAmount: 0,
        }

        jobs.forEach((item) => {
            const monthKey = toMonthKey(item.Datum || item.DatumNaplanovano)
            if (!monthKey) return

            if (monthKey === thisMonthKey) {
                data.thisMonthCount += 1
                data.thisMonthKm += Math.round(Number(item.Doprava) || 0)
                data.thisMonthAmount += Math.round(Number(item.CenaZakazky) || 0)
            }

            if (monthKey === lastMonthKey) {
                data.lastMonthCount += 1
            }
        })

        return data
    }, [jobs])

    const monthLabels = useMemo(() => {
        const now = new Date()
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return {
            thisMonth: formatMonthYearCz(now),
            lastMonth: formatMonthYearCz(lastMonthDate),
        }
    }, [])

    const latest = useMemo(() => {
        return [...jobs]
            .sort((a, b) => (b.ZakazkaId || 0) - (a.ZakazkaId || 0))
            .slice(0, 8)
    }, [jobs])

    const upcoming = useMemo(() => {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 7)

        return jobs
            .filter((item) => {
                if (!item.DatumNaplanovano) return false
                const date = new Date(item.DatumNaplanovano)
                if (Number.isNaN(date.getTime())) return false
                return date >= start && date < end
            })
            .sort((a, b) => new Date(a.DatumNaplanovano).getTime() - new Date(b.DatumNaplanovano).getTime())
            .slice(0, 8)
    }, [jobs])

    return (
        <div>
            <h2 className="page-header">Dashboard technika</h2>

            {canViewAll ? (
                <div className="card" style={{ padding: 16 }}>
                    <button
                        type="button"
                        className="btn btn-blue crm-scope-btn"
                        onClick={() => setScope((prev) => (prev === 'all' ? 'mine' : 'all'))}
                        title={scope === 'all' ? 'Přepnout na moje zakázky' : 'Přepnout na všechny zakázky'}
                    >
                        <i className={`bx ${scope === 'all' ? 'bx-group' : 'bx-user'}`}></i>
                        {scope === 'all' ? 'Dashboard: Vidím vše' : 'Dashboard: Vidím sebe'}
                    </button>
                </div>
            ) : null}

            {error ? <div className="card"><p className="crm-error">{error}</p></div> : null}

            <div className="row">
                <div className="col-3 col-md-6 col-sm-12">
                    <StatusCard icon='bx bx-briefcase-alt-2' count={loading ? '...' : stats.thisMonthCount} title={`Počet zakázek (${monthLabels.thisMonth})`} />
                </div>
                <div className="col-3 col-md-6 col-sm-12">
                    <StatusCard icon='bx bx-history' count={loading ? '...' : stats.lastMonthCount} title={`Počet zakázek (${monthLabels.lastMonth})`} />
                </div>
                <div className="col-3 col-md-6 col-sm-12">
                    <StatusCard
                        icon='bx bx-map'
                        count={loading ? '...' : `${stats.thisMonthKm.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} km`}
                        title='Najeto tento měsíc'
                        countClassName='status-card__count--compact'
                    />
                </div>
                <div className="col-3 col-md-6 col-sm-12">
                    <StatusCard
                        icon='bx bx-wallet'
                        count={loading ? '...' : formatCzkInteger(stats.thisMonthAmount)}
                        title='Měsíční obrat'
                        countClassName='status-card__count--compact'
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-7 col-md-12">
                    <div className="card">
                        <div className="card__header">
                            <h3>Nejnovější zakázky</h3>
                        </div>
                        <div className="card__body">
                            <Table
                                limit='8'
                                headData={['ID', 'Zakázka', 'Zákazník', 'Status', 'Termín']}
                                renderHead={(item, index) => <th key={index}>{item}</th>}
                                bodyData={latest}
                                renderBody={(item) => (
                                    <tr key={item.ZakazkaId}>
                                        <td><Link to={`/zakazky/${item.ZakazkaId}`}>#{item.ZakazkaId}</Link></td>
                                        <td>{item.NazevZakazky}</td>
                                        <td>{item.NazevZakaznika || 'Bez zákazníka'}</td>
                                        <td>
                                            <Badge
                                                type={statusToBadge[String(item.Status || '').toLowerCase()] || 'primary'}
                                                content={item.Status || 'neznámý'}
                                            />
                                        </td>
                                        <td>{item.DatumNaplanovano || 'bez termínu'}</td>
                                    </tr>
                                )}
                            />
                        </div>
                        <div className="card__footer">
                            <Link to='/zakazky'>Otevřít přehled zakázek</Link>
                        </div>
                    </div>
                </div>
                <div className="col-5 col-md-12">
                    <div className="card">
                        <div className="card__header">
                            <h3>Nadcházející termíny (7 dní)</h3>
                        </div>
                        <div className="card__body">
                            <Table
                                limit='8'
                                headData={['Termín', 'Zakázka']}
                                renderHead={(item, index) => <th key={index}>{item}</th>}
                                bodyData={upcoming}
                                renderBody={(item) => (
                                    <tr key={item.ZakazkaId}>
                                        <td>{item.DatumNaplanovano || '-'}</td>
                                        <td><Link to={`/zakazky/${item.ZakazkaId}`}>{item.NazevZakazky}</Link></td>
                                    </tr>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
