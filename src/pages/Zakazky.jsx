import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../components/table/Table';
import { fetchCustomers, fetchJobsByEmail, fetchJobsPage } from '../lib/crmClient';

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
const PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 500;
const PAGE_REQUEST_GAP_MS = 120;

const mergeUniqueJobs = (base, extra) => {
  const seen = new Set((base || []).map((item) => String(item.ZakazkaId)));
  const added = (extra || []).filter((item) => !seen.has(String(item.ZakazkaId)));
  return [...(base || []), ...added];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('all');
  const [technikId, setTechnikId] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const showTechnicianFilter = canViewAll;
  const hasSearch = search.trim().length > 0;
  const activeSearchRequestRef = useRef(0);

  useEffect(() => {
    if (!showTechnicianFilter) setTechnikId('all');
  }, [showTechnicianFilter]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cancelled) {
        setLoading(true);
        setError('');
      }

      const wantsAll = canViewAll;

      try {
        if (wantsAll) {
          const customerList = await fetchCustomers();
          if (!cancelled) {
            setCustomers(customerList);
          }
          return;
        }

        let jobRequest;
        jobRequest = fetchJobsByEmail(email);

        const [jobList, customerList] = await Promise.all([jobRequest, fetchCustomers()]);
        if (!cancelled) {
          setJobs(jobList);
          setCustomers(customerList);
          setHasMore(false);
          setPage(1);
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
  }, [canViewAll, email]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const requestId = activeSearchRequestRef.current + 1;
    activeSearchRequestRef.current = requestId;

    const run = async () => {
      const wantsAll = canViewAll;
      if (!wantsAll) return;

      const selectedTechnik = TECHNICI.find((item) => item.id === technikId) || null;
      const technicianEmail = selectedTechnik ? selectedTechnik.email : '';

      if (!cancelled) {
        setLoading(true);
        setError('');
      }

      try {
        const pageSize = search.trim() ? SEARCH_PAGE_SIZE : PAGE_SIZE;
        const result = await fetchJobsPage({
          email,
          technicianEmail,
          search,
          page: 1,
          pageSize,
          signal: controller.signal,
        });

        let mergedItems = result.items || [];
        let nextHasMore = Boolean(result.hasMore);
        let loadedPage = 1;
        const q = search.trim().toLowerCase();

        // During search, always load all pages so results are not limited by pagination.
        while (!cancelled && q && nextHasMore) {
          await delay(PAGE_REQUEST_GAP_MS);
          const nextPage = loadedPage + 1;
          const next = await fetchJobsPage({
            email,
            technicianEmail,
            search,
            page: nextPage,
            pageSize,
            signal: controller.signal,
          });

          if (!next.items || next.items.length === 0) {
            nextHasMore = false;
            break;
          }

          const beforeCount = mergedItems.length;
          mergedItems = mergeUniqueJobs(mergedItems, next.items || []);
          if (mergedItems.length === beforeCount) {
            nextHasMore = false;
            break;
          }
          nextHasMore = Boolean(next.hasMore);
          loadedPage = nextPage;
        }

        if (!cancelled && activeSearchRequestRef.current === requestId) {
          setJobs(mergedItems);
          setHasMore(q ? false : nextHasMore);
          setPage(loadedPage);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Načtení zakázek selhalo');
          setJobs([]);
          setHasMore(false);
          setPage(1);
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
      controller.abort();
    };
  }, [canViewAll, email, technikId, search]);

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;

    const wantsAll = canViewAll;
    if (!wantsAll) return;

    const selectedTechnik = TECHNICI.find((item) => item.id === technikId) || null;
    const technicianEmail = selectedTechnik ? selectedTechnik.email : '';
    const nextPage = page + 1;

    setLoadingMore(true);
    setError('');

    try {
      const result = await fetchJobsPage({
        email,
        technicianEmail,
        search,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      setJobs((prev) => mergeUniqueJobs(prev, result.items || []));
      setHasMore(Boolean(result.hasMore));
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Načtení dalších zakázek selhalo');
    } finally {
      setLoadingMore(false);
    }
  };

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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(searchInput.trim());
            }}
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

        {showTechnicianFilter && !hasSearch ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            {hasMore ? (
              <button type="button" className="btn btn-blue" disabled={loadingMore || loading} onClick={loadMore}>
                {loadingMore ? 'Načítám další...' : 'Načíst další zakázky'}
              </button>
            ) : (
              <span style={{ color: '#777' }}>Další zakázky nejsou k dispozici</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Zakazky;
