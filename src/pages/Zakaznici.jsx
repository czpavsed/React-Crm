import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../components/table/Table';
import { fetchCustomers } from '../lib/crmClient';

const Zakaznici = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await fetchCustomers();
        setCustomers(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Načtení zákazníků selhalo');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? customers.filter((item) => {
          const text = [item.ZakaznikId, item.Nazev, item.Ulice, item.IC, item.KontaktniOsoba, item.Telefon, item.Email]
            .filter(Boolean)
            .join(' | ')
            .toLowerCase();
          return text.includes(q);
        })
      : customers;

    return [...base].sort((a, b) => (b.ZakaznikId || 0) - (a.ZakaznikId || 0));
  }, [customers, search]);

  return (
    <div>
      <h2 className="page-header">Zákazníci</h2>

      <div className="card">
        <div className="crm-toolbar">
          <input
            placeholder="Hledat podle názvu, adresy, kontaktu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link className="btn btn-primary" to="/zakaznici/novy">
            Nový zákazník
          </Link>
        </div>

        {error ? <p className="crm-error" style={{ marginTop: 15 }}>{error}</p> : null}
        {loading ? <p style={{ marginTop: 15 }}>Načítám...</p> : null}

        <Table
          headData={['ID', 'Název', 'Adresa', 'Kontakt', 'Telefon', 'Email', 'Akce']}
          renderHead={(item, index) => <th key={index}>{item}</th>}
          bodyData={filtered}
          renderBody={(item) => (
            <tr key={item.ZakaznikId}>
              <td>{item.ZakaznikId}</td>
              <td>{item.Nazev || '-'}</td>
              <td>{item.Ulice || '-'}</td>
              <td>{item.KontaktniOsoba || '-'}</td>
              <td>{item.Telefon || '-'}</td>
              <td>{item.Email || '-'}</td>
              <td>
                <Link to={`/zakaznici/${item.ZakaznikId}`}>Upravit</Link>
              </td>
            </tr>
          )}
        />
      </div>
    </div>
  );
};

export default Zakaznici;
