import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { createCustomer, deleteJobById, fetchAllJobsForScope, fetchCustomers, fetchJobsByEmail, saveJob } from '../lib/crmClient';

const todayIso = () => new Date().toISOString().slice(0, 10);

const FIRMY = [
  { id: '1', name: 'Derator s.r.o.' },
  { id: '2', name: 'Tomáš Raška - DDD služby' },
  { id: '3', name: 'Derabyt s.r.o.' },
  { id: '4', name: 'Deratizace Raška s.r.o.' },
];

const ZAMESTNANCI = [
  { id: '1', fullName: 'Tomáš Raška', email: 'tomas.raska@derator.cz', kmRate: 5.5 },
  { id: '1007', fullName: 'Pavel Sedláček', email: 'pavel.sedlacek@derator.cz', kmRate: 1.0 },
  { id: '1011', fullName: 'Filip Landovský', email: 'filip.landovsky@derator.cz', kmRate: 5.5 },
  { id: '1012', fullName: 'Libor Landovský', email: 'libor.landovsky@derator.cz', kmRate: 5.5 },
  { id: '1013', fullName: 'Jaromír Mareš', email: 'jaromir.mares@derator.cz', kmRate: 5.5 },
  { id: '1027', fullName: 'Petr Sedláček', email: 'petr.sedlacek@derator.cz', kmRate: 5.5 },
  { id: '1042', fullName: 'Radek Steppan', email: 'radek.steppan@derator.cz', kmRate: 5.5 },
  { id: '1044', fullName: 'Adam Duda', email: 'adam.duda@derator.cz', kmRate: 5.5 },
  { id: '1048', fullName: 'Vladimír Nedopil', email: 'vladimir.nedopil@derator.cz', kmRate: 5.5 },
  { id: '1050', fullName: 'Lukáš Franěk', email: 'lukas.franek@derator.cz', kmRate: 5.5 },
];

const ZPUSOBY_PLATBY = [
  { id: '1', label: 'Hotově' },
  { id: '2', label: 'Faktura (Převodem)' },
];

const SKUDCI = [
  { id: '1', label: 'Deratizace' },
  { id: '2', label: 'Dezinsekce' },
  { id: '3', label: 'Dezinfekce' },
  { id: '4', label: 'Myš, potkan, krysa' },
  { id: '5', label: 'Rus, Šváb' },
  { id: '6', label: 'Štěnice' },
  { id: '7', label: 'Vosy, včely, sršni' },
  { id: '8', label: 'Blechy' },
  { id: '9', label: 'Mouhy, pavouci' },
  { id: '10', label: 'Ostatní' },
  { id: '11', label: 'Mravenci' },
  { id: '12', label: 'Fumigace' },
];

const DEV_VIEW_ALL_EMAILS = new Set(['pavel.sedlacek@derator.cz']);

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getEmployeeIdByEmail = (userEmail) => {
  const match = ZAMESTNANCI.find((item) => normalizeEmail(item.email) === normalizeEmail(userEmail));
  return match ? match.id : '';
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.').trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

const toIntegerOrNull = (value) => {
  const n = toNumberOrNull(value);
  return n === null ? null : Math.round(n);
};

const normalizeWholeInputValue = (value) => {
  const rounded = toIntegerOrNull(value);
  return rounded === null ? '' : String(rounded);
};

const emptyCustomer = {
  Nazev: '',
  Ulice: '',
  KontaktniOsoba: '',
  Telefon: '',
};

const ZakazkaForm = ({ email }) => {
  const history = useHistory();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    ZakazkaId: null,
    NazevZakazky: '',
    ZakaznikId: 0,
    Datum: todayIso(),
    ZamestnanecId: '',
    FirmaId: '',
    Poznamka: '',
    DatumNaplanovano: '',
    CenaZakazky: '',
    OstatniNaklady: '',
    DopravaKm: '',
    CisloProtokolu: '',
    ZpusobPlatbyId: '2',
    SkudceId: '10',
    StatusId: '1',
    FakturaStatusId: '1',
  });
  const [customers, setCustomers] = useState([]);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [customerSearch, setCustomerSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState('list');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const defaultEmployeeId = useMemo(() => getEmployeeIdByEmail(email), [email]);
  const canViewAll = useMemo(() => DEV_VIEW_ALL_EMAILS.has(normalizeEmail(email)), [email]);

  useEffect(() => {
    const run = async () => {
      setError('');
      try {
        const customerList = await fetchCustomers();
        setCustomers(customerList);

        if (isEdit) {
          let jobs;
          if (canViewAll) {
            jobs = await fetchAllJobsForScope({
              emails: ZAMESTNANCI.map((item) => item.email),
              currentUserEmail: email,
            });
          } else {
            jobs = await fetchJobsByEmail(email);
          }

          const item = jobs.find((x) => Number(x.ZakazkaId) === Number(id));
          if (!item) throw new Error('Zakázka nebyla nalezena.');

          setForm({
            ZakazkaId: item.ZakazkaId,
            NazevZakazky: item.NazevZakazky || '',
            ZakaznikId: item.ZakaznikId || 0,
            Datum: item.Datum || todayIso(),
            ZamestnanecId: item.ZamestnanecId ? String(item.ZamestnanecId) : (defaultEmployeeId || ''),
            FirmaId: item.FirmaId ? String(item.FirmaId) : '1',
            Poznamka: item.Poznamka || item.Popis || '',
            DatumNaplanovano: item.DatumNaplanovano || '',
            CenaZakazky: item.CenaZakazky !== null && item.CenaZakazky !== undefined ? String(Math.round(Number(item.CenaZakazky) || 0)) : '',
            OstatniNaklady: item.OstatniNaklady !== null && item.OstatniNaklady !== undefined ? String(Math.round(Number(item.OstatniNaklady) || 0)) : '',
            DopravaKm: item.Doprava !== null && item.Doprava !== undefined ? String(Math.round(Number(item.Doprava) || 0)) : '',
            CisloProtokolu: item.CisloProtokolu !== null && item.CisloProtokolu !== undefined ? String(Math.round(Number(item.CisloProtokolu) || 0)) : '',
            ZpusobPlatbyId: item.ZpusobPlatbyId ? String(item.ZpusobPlatbyId) : '2',
            SkudceId: item.SkudceId ? String(item.SkudceId) : '10',
            StatusId: item.StatusId ? String(item.StatusId) : '1',
            FakturaStatusId: item.FakturaStatusId ? String(item.FakturaStatusId) : '1',
          });
        } else {
          setForm((prev) => ({
            ...prev,
            Datum: prev.Datum || todayIso(),
            FirmaId: prev.FirmaId || '1',
            ZamestnanecId: prev.ZamestnanecId || defaultEmployeeId || '',
            ZpusobPlatbyId: prev.ZpusobPlatbyId || '2',
            SkudceId: prev.SkudceId || '10',
            CisloProtokolu: prev.CisloProtokolu || '',
          }));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Načtení formuláře selhalo');
      }
    };

    run();
  }, [id, isEdit, email, defaultEmployeeId, canViewAll]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const text = [c.ZakaznikId, c.Nazev, c.Ulice, c.KontaktniOsoba, c.Email, c.Telefon].filter(Boolean).join(' | ').toLowerCase();
      return text.includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((item) => Number(item.ZakaznikId) === Number(form.ZakaznikId)) || null;
  }, [customers, form.ZakaznikId]);

  const selectedEmployee = useMemo(() => {
    return ZAMESTNANCI.find((item) => item.id === String(form.ZamestnanecId)) || null;
  }, [form.ZamestnanecId]);

  const travelCost = useMemo(() => {
    const km = toNumberOrNull(form.DopravaKm) || 0;
    const rate = selectedEmployee ? selectedEmployee.kmRate : 0;
    return Math.round(km * rate);
  }, [form.DopravaKm, selectedEmployee]);

  const openPicker = () => {
    setPickerOpen(true);
    setPickerMode('list');
    setCustomerSearch('');
    setCustomerForm(emptyCustomer);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerMode('list');
  };

  const selectCustomer = (customer) => {
    setForm((prev) => ({
      ...prev,
      ZakaznikId: Number(customer.ZakaznikId),
      NazevZakazky: (customer.Nazev || prev.NazevZakazky || '').trim(),
    }));
    closePicker();
  };

  const saveCustomerAndSelect = async () => {
    setError('');
    setSavingCustomer(true);
    try {
      if (!customerForm.Nazev.trim()) throw new Error('Vyplňte název zákazníka.');

      const payload = {
        Nazev: customerForm.Nazev.trim(),
        Ulice: customerForm.Ulice.trim() || null,
        KontaktniOsoba: customerForm.KontaktniOsoba.trim() || null,
        Telefon: customerForm.Telefon.trim() || null,
      };

      const created = await createCustomer(payload);
      const refreshed = await fetchCustomers();
      setCustomers(refreshed);

      const selectedId = created && created.ZakaznikId ? created.ZakaznikId : 0;
      if (selectedId) {
        const createdCustomer = refreshed.find((c) => Number(c.ZakaznikId) === Number(selectedId));
        if (createdCustomer) {
          setForm((prev) => ({
            ...prev,
            ZakaznikId: selectedId,
            NazevZakazky: (createdCustomer.Nazev || prev.NazevZakazky || '').trim(),
          }));
        } else {
          setForm((prev) => ({ ...prev, ZakaznikId: selectedId }));
        }
      }

      setCustomerForm(emptyCustomer);
      closePicker();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vytvoření zákazníka selhalo');
    } finally {
      setSavingCustomer(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!form.ZakaznikId) throw new Error('Vyberte zákazníka.');
      if (!form.Datum) throw new Error('Vyplňte datum zakázky.');
      if (!form.ZamestnanecId || Number(form.ZamestnanecId) <= 0) throw new Error('Vyplňte Zaměstnanec ID.');
      if (!form.FirmaId || Number(form.FirmaId) <= 0) throw new Error('Vyplňte Firma ID.');

      const customer = customers.find((item) => Number(item.ZakaznikId) === Number(form.ZakaznikId));
      const jobName = (customer?.Nazev || form.NazevZakazky || '').trim();
      if (!jobName) throw new Error('Zvolený zákazník nemá název.');

      await saveJob({
        ZakazkaId: form.ZakazkaId,
        Datum: form.Datum,
        ZakaznikId: Number(form.ZakaznikId),
        ZamestnanecId: Number(form.ZamestnanecId),
        FirmaId: Number(form.FirmaId),
        NazevZakazky: jobName,
        ZpusobPlatbyId: Number(form.ZpusobPlatbyId) || null,
        SkudceId: Number(form.SkudceId) || null,
        CisloProtokolu: toIntegerOrNull(form.CisloProtokolu),
        Doprava: toIntegerOrNull(form.DopravaKm),
        CenaZakazky: toIntegerOrNull(form.CenaZakazky),
        OstatniNaklady: toIntegerOrNull(form.OstatniNaklady),
        Poznamka: form.Poznamka.trim() || null,
        Popis: form.Poznamka.trim() || null,
        Datum_naplanovano: form.DatumNaplanovano || null,
        StatusId: Number(form.StatusId) || null,
        FakturaStatusId: Number(form.FakturaStatusId) || 1,
        ChangedBy: email,
        CreatedBy: email,
        TechnikEmail: email,
      });

      history.push('/zakazky');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uložení zakázky selhalo');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isEdit || !form.ZakazkaId) return;
    if (!window.confirm(`Opravdu chcete smazat zakázku #${form.ZakazkaId}?`)) return;

    try {
      await deleteJobById(form.ZakazkaId);
      history.push('/zakazky');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Smazání zakázky selhalo');
    }
  };

  return (
    <div>
      <h2 className="page-header">{isEdit ? `Editace zakázky #${id}` : 'Nová zakázka'}</h2>
      <div className="card">
        {error ? <p className="crm-error">{error}</p> : null}

        <form onSubmit={submit} className="form-grid crm-form-layout">
          <div className="crm-actions-row">
            <Link to="/zakazky">Zpět na přehled</Link>
          </div>

          <div className="crm-form-row crm-form-row--4">
            <div className="crm-form-field crm-form-field--span-2">
              <label>Zákazník</label>
              <div className="crm-customer-field">
                <input
                  value={selectedCustomer ? `${selectedCustomer.Nazev || 'Neznámý'}${selectedCustomer.Ulice ? `, ${selectedCustomer.Ulice}` : ''}` : ''}
                  placeholder="Není vybraný zákazník"
                  readOnly
                />
                <button type="button" className="btn btn-primary" onClick={openPicker}>Vybrat zákazníka</button>
              </div>
            </div>

            <div className="crm-form-field">
              <label>Status zakázky</label>
              <select value={form.StatusId} onChange={(e) => setForm((p) => ({ ...p, StatusId: e.target.value }))}>
                <option value="1">Nová</option>
                <option value="2">Naplánovaná</option>
                <option value="3">Odloženo</option>
                <option value="4">Hotová</option>
                <option value="5">Smazaná</option>
                <option value="6">Nová AI</option>
              </select>
            </div>

            <div className="crm-form-field">
              <label>Status vyfakturování</label>
              <select value={form.FakturaStatusId} onChange={(e) => setForm((p) => ({ ...p, FakturaStatusId: e.target.value }))}>
                <option value="1">Nevyfakturováno</option>
                <option value="2">Vyfakturováno</option>
              </select>
            </div>
          </div>

          <div className="crm-form-row crm-form-row--4">
            <div className="crm-form-field">
              <label>Firma</label>
              <select value={form.FirmaId} onChange={(e) => setForm((p) => ({ ...p, FirmaId: e.target.value }))} required>
                {FIRMY.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            <div className="crm-form-field">
              <label>Škůdce</label>
              <select value={form.SkudceId} onChange={(e) => setForm((p) => ({ ...p, SkudceId: e.target.value }))}>
                {SKUDCI.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="crm-form-field">
              <label>Technik</label>
              <select value={form.ZamestnanecId} onChange={(e) => setForm((p) => ({ ...p, ZamestnanecId: e.target.value }))} required>
                <option value="">Vyberte technika</option>
                {ZAMESTNANCI.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                ))}
              </select>
            </div>

            <div className="crm-form-field">
              <label>Číslo protokolu</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.CisloProtokolu}
                onChange={(e) => setForm((p) => ({ ...p, CisloProtokolu: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, CisloProtokolu: normalizeWholeInputValue(e.target.value) }))}
              />
            </div>
          </div>

          <div className="crm-form-row crm-form-row--4">
            <div className="crm-form-field">
              <label>Datum zakázky</label>
              <input type="date" value={form.Datum} onChange={(e) => setForm((p) => ({ ...p, Datum: e.target.value }))} required />
            </div>

            <div className="crm-form-field">
              <label>Plánované datum</label>
              <input type="date" value={form.DatumNaplanovano} onChange={(e) => setForm((p) => ({ ...p, DatumNaplanovano: e.target.value }))} />
            </div>

          </div>

          <div className="crm-form-row crm-form-row--4">
            <div className="crm-form-field">
              <label>Cena zakázky</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.CenaZakazky}
                onChange={(e) => setForm((p) => ({ ...p, CenaZakazky: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, CenaZakazky: normalizeWholeInputValue(e.target.value) }))}
              />
            </div>

            <div className="crm-form-field">
              <label>Způsob platby</label>
              <select value={form.ZpusobPlatbyId} onChange={(e) => setForm((p) => ({ ...p, ZpusobPlatbyId: e.target.value }))}>
                {ZPUSOBY_PLATBY.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>

            <div className="crm-form-field">
              <label>Doprava v km</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.DopravaKm}
                onChange={(e) => setForm((p) => ({ ...p, DopravaKm: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, DopravaKm: normalizeWholeInputValue(e.target.value) }))}
              />
              <small className="crm-form-note">
                {`Doprava: ${travelCost.toLocaleString('cs-CZ')} Kč`}
              </small>
            </div>

            <div className="crm-form-field">
              <label>Ostatní náklady</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.OstatniNaklady}
                onChange={(e) => setForm((p) => ({ ...p, OstatniNaklady: e.target.value }))}
                onBlur={(e) => setForm((p) => ({ ...p, OstatniNaklady: normalizeWholeInputValue(e.target.value) }))}
              />
            </div>
          </div>

          <div className="crm-form-field">
            <label>Poznámka</label>
            <textarea value={form.Poznamka} onChange={(e) => setForm((p) => ({ ...p, Poznamka: e.target.value }))} rows={4} />
          </div>

          <div className="crm-actions-row">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Ukládám...' : 'Uložit'}</button>
            {isEdit ? <button className="btn btn-danger" type="button" onClick={remove}>Smazat</button> : null}
          </div>
        </form>
      </div>

      {pickerOpen ? (
        <div className="crm-modal-backdrop" role="dialog" aria-modal="true" aria-label="Výběr zákazníka">
          <div className="crm-modal-card">
            {pickerMode === 'list' ? (
              <>
                <div className="crm-modal-header">
                  <h3>Výběr zákazníka</h3>
                  <div className="crm-modal-header-actions">
                    <button type="button" className="btn btn-primary" onClick={() => setPickerMode('create')}>Vytvořit</button>
                    <button type="button" className="crm-modal-close-btn" aria-label="Zavřít" onClick={closePicker}>
                      <i className='bx bx-x'></i>
                    </button>
                  </div>
                </div>

                <input
                  className="crm-modal-search"
                  placeholder="Hledat zákazníka..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />

                <div className="crm-customer-list">
                  {filteredCustomers.length ? filteredCustomers.map((customer) => (
                    <div key={customer.ZakaznikId} className="crm-customer-list__item">
                      <div>
                        <strong>{customer.Nazev || 'Neznámý'}</strong>
                        <p>{customer.Ulice || '-'}</p>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={() => selectCustomer(customer)}>Vybrat</button>
                    </div>
                  )) : <p>Žádný zákazník neodpovídá hledání.</p>}
                </div>
              </>
            ) : (
              <>
                <div className="crm-modal-header">
                  <h3>Nový zákazník</h3>
                  <button type="button" className="btn" onClick={() => setPickerMode('list')}>Zpět na výběr</button>
                </div>

                <div className="form-grid">
                  <label>Název zákazníka</label>
                  <input
                    value={customerForm.Nazev}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, Nazev: e.target.value }))}
                    required
                  />

                  <label>Adresa</label>
                  <input
                    value={customerForm.Ulice}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, Ulice: e.target.value }))}
                  />

                  <label>Kontaktní osoba</label>
                  <input
                    value={customerForm.KontaktniOsoba}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, KontaktniOsoba: e.target.value }))}
                  />

                  <label>Telefon</label>
                  <input
                    value={customerForm.Telefon}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, Telefon: e.target.value }))}
                  />

                  <div className="crm-actions-row">
                    <button type="button" className="btn btn-primary" onClick={saveCustomerAndSelect} disabled={savingCustomer}>
                      {savingCustomer ? 'Ukládám...' : 'Uložit'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ZakazkaForm;
