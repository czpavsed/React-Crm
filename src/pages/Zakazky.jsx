import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../components/table/Table';
import { fetchAllJobsForScope, fetchCustomers, fetchJobsByEmail } from '../lib/crmClient';

const DEV_VIEW_ALL_EMAILS = new Set(['pavel.sedlacek@derator.cz']);
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
];

const SKUDCI = [
  { id: 1, label: 'Deratizace' },
  { id: 2, label: 'Dezinsekce' },
  { id: 3, label: 'Dezinfekce' },
  { id: 4, label: 'Myš, potkan, krysa' },
  { id: 5, label: 'Rus, Šváb' },
  { id: 6, label: 'Štěnice' },
  { id: 7, label: 'Vosy, včely, sršni' },
  { id: 8, label: 'Blechy' },
  { id: 9, label: 'Mouhy, pavouci' },
  { id: 10, label: 'Ostatní' },
  { id: 11, label: 'Mravenci' },
  { id: 12, label: 'Fumigace' },
];

const normalize = (value) => String(value || '').trim().toLowerCase();

const formatCurrency = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${Math.round(n).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Kč`;
};

const formatDateCz = (value) => {
  if (!value) return '-';
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
};

const paymentLabel = (paymentId) => {
  const id = Number(paymentId);
  if (id === 1) return 'Hotově';
  if (id === 2) return 'Faktura';
  return '-';
};

const skudceLabel = (item) => {
  if (item && item.Skudce) return item.Skudce;
  const id = Number(item && item.SkudceId);
  const found = SKUDCI.find((s) => s.id === id);
  return found ? found.label : '-';
};

const technicianName = (item) => {
  const byId = TECHNICI.find((tech) => String(tech.id) === String(item && item.ZamestnanecId));
  if (byId) return byId.fullName.split(' ')[0] || byId.fullName;
  const byEmail = TECHNICI.find((tech) => normalize(tech.email) === normalize(item && item.TechnikEmail));
  if (!byEmail) return '-';
  return byEmail.fullName.split(' ')[0] || byEmail.fullName;
};

const Zakazky = ({ email }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const canViewAll = DEV_VIEW_ALL_EMAILS.has(normalizedEmail);

  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [scope, setScope] = useState(canViewAll ? 'all' : 'mine');
  const [technikId, setTechnikId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showTechnicianFilter = canViewAll && scope === 'all';

  useEffect(() => {
    if (!showTechnicianFilter) setTechnikId('all');
  }, [showTechnicianFilter]);

  useEffect(() => {
    setScope(canViewAll ? 'all' : 'mine');
  }, [canViewAll]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cancelled) {
        setLoading(true);
        setError('');
      }

      const wantsAll = canViewAll && scope === 'all';

      try {
        let jobRequest;
        if (wantsAll) {
          jobRequest = fetchAllJobsForScope({
            emails: TECHNICI.map((item) => item.email),
            currentUserEmail: email,
          });
        } else {
          jobRequest = fetchJobsByEmail(email);
        }

        const [jobList, customerList] = await Promise.all([jobRequest, fetchCustomers()]);
        if (!cancelled) {
          setJobs(jobList);
          setCustomers(customerList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Načtení zakázek selhalo');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [canViewAll, email, scope]);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.ZakaznikId, c));
    return map;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const selectedTechnik = TECHNICI.find((item) => item.id === technikId) || null;

    return jobs
      .filter((item) => {
        if (showTechnicianFilter && selectedTechnik) {
          const itemEmployeeId = String(item.ZamestnanecId || '').trim();
          const itemEmail = normalize(item.TechnikEmail);
          const matchById = itemEmployeeId && itemEmployeeId === selectedTechnik.id;
          const matchByEmail = itemEmail && itemEmail === normalize(selectedTechnik.email);
          if (!matchById && !matchByEmail) return false;
        }

        const paymentId = String(item.ZpusobPlatbyId || '');
        if (payment !== 'all' && paymentId !== payment) return false;

        if (!q) return true;

        const customer = customerMap.get(item.ZakaznikId);
        const text = [
          item.ZakazkaId,
          item.NazevZakazky,
          item.NazevZakaznika,
          skudceLabel(item),
          technicianName(item),
          customer ? customer.Nazev : '',
          customer ? customer.Ulice : '',
          paymentLabel(item.ZpusobPlatbyId),
          item.Status,
          item.DatumNaplanovano,
          item.Popis,
        ]
          .filter(Boolean)
          .join(' | ')
          .toLowerCase();

        return text.includes(q);
      })
      .sort((a, b) => (b.ZakazkaId || 0) - (a.ZakazkaId || 0));
  }, [jobs, payment, search, customerMap, showTechnicianFilter, technikId]);

  return (
    <div>
      <h2 className="page-header">Přehled zakázek</h2>

      <div className="card">
        <div className={`crm-toolbar ${showTechnicianFilter ? 'crm-toolbar--jobs-all' : ''}`}>
          <input
            placeholder="Hledat podle názvu, zákazníka, adresy, popisu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="all">Všechny platby</option>
            <option value="1">Hotově</option>
            <option value="2">Faktura</option>
          </select>
          {showTechnicianFilter ? (
            <select value={technikId} onChange={(e) => setTechnikId(e.target.value)}>
              <option value="all">Všichni technici</option>
              {TECHNICI.map((item) => (
                <option key={item.id} value={item.id}>{item.fullName.split(' ')[0] || item.fullName}</option>
              ))}
            </select>
          ) : null}
          {canViewAll ? (
            <button
              type="button"
              className="btn btn-blue crm-scope-btn"
              onClick={() => setScope((prev) => (prev === 'all' ? 'mine' : 'all'))}
              title={scope === 'all' ? 'Přepnout na moje zakázky' : 'Přepnout na všechny zakázky'}
            >
              <i className={`bx ${scope === 'all' ? 'bx-group' : 'bx-user'}`}></i>
              {scope === 'all' ? 'Vidím vše' : 'Vidím sebe'}
            </button>
          ) : null}
          <Link className="btn btn-primary" to="/zakazky/nova">
            Nová zakázka
          </Link>
        </div>

        {error ? <p className="crm-error" style={{ marginTop: 15 }}>{error}</p> : null}
        {loading ? <p style={{ marginTop: 15 }}>Načítám...</p> : null}

        <Table
          headData={['Datum', 'Zákazník', 'Adresa', 'Škůdce', 'Technik', 'Cena', 'Doprava', 'Způsob platby', 'Akce']}
          renderHead={(item, index) => <th key={index}>{item}</th>}
          bodyData={filtered}
          renderBody={(item) => {
            const customer = customerMap.get(item.ZakaznikId);
            const dateValue = item.DatumNaplanovano || item.Datum || '-';
            return (
              <tr key={item.ZakazkaId}>
                <td>{formatDateCz(dateValue)}</td>
                <td>{item.NazevZakaznika || (customer ? customer.Nazev : 'Bez zákazníka')}</td>
                <td>{customer ? customer.Ulice || '-' : '-'}</td>
                <td>{skudceLabel(item)}</td>
                <td>{technicianName(item)}</td>
                <td>{formatCurrency(item.CenaZakazky)}</td>
                <td>{item.Doprava !== null && item.Doprava !== undefined ? `${item.Doprava} km` : '-'}</td>
                <td>{paymentLabel(item.ZpusobPlatbyId)}</td>
                <td>
                  <Link className="btn btn-blue table-action-btn" to={`/zakazky/${item.ZakazkaId}`}>Upravit</Link>
                </td>
              </tr>
            );
          }}
        />
      </div>
    </div>
  );
};

export default Zakazky;
