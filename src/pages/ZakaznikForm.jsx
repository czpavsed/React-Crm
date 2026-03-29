import React, { useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { createCustomer, fetchCustomers, updateCustomer } from '../lib/crmClient';

const initial = {
  ZakaznikId: null,
  Nazev: '',
  Ulice: '',
  IC: '',
  KontaktniOsoba: '',
  Telefon: '',
  Email: '',
};

const ZakaznikForm = () => {
  const history = useHistory();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    const run = async () => {
      setError('');
      try {
        const list = await fetchCustomers();
        const found = list.find((item) => Number(item.ZakaznikId) === Number(id));
        if (!found) throw new Error('Zákazník nebyl nalezen.');

        setForm({
          ZakaznikId: found.ZakaznikId,
          Nazev: found.Nazev || '',
          Ulice: found.Ulice || '',
          IC: found.IC || '',
          KontaktniOsoba: found.KontaktniOsoba || '',
          Telefon: found.Telefon || '',
          Email: found.Email || '',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Načtení zákazníka selhalo');
      }
    };

    run();
  }, [id, isEdit]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!form.Nazev.trim()) throw new Error('Vyplňte název zákazníka.');

      const payload = {
        Nazev: form.Nazev.trim(),
        Ulice: form.Ulice.trim() || null,
        IC: form.IC.trim() || null,
        KontaktniOsoba: form.KontaktniOsoba.trim() || null,
        Telefon: form.Telefon.trim() || null,
        Email: form.Email.trim() || null,
      };

      if (isEdit) {
        await updateCustomer({ ...payload, ZakaznikId: Number(form.ZakaznikId || id) });
      } else {
        await createCustomer(payload);
      }

      history.push('/zakaznici');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uložení zákazníka selhalo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="page-header">{isEdit ? `Editace zákazníka #${id}` : 'Nový zákazník'}</h2>

      <div className="card">
        {error ? <p className="crm-error">{error}</p> : null}

        <form onSubmit={submit} className="form-grid">
          <div className="crm-actions-row">
            <Link to="/zakaznici">Zpět na seznam</Link>
          </div>

          <label>Název firmy / zákazníka</label>
          <input value={form.Nazev} onChange={(e) => setForm((p) => ({ ...p, Nazev: e.target.value }))} required />

          <label>Adresa</label>
          <input value={form.Ulice} onChange={(e) => setForm((p) => ({ ...p, Ulice: e.target.value }))} />

          <label>IČ</label>
          <input value={form.IC} onChange={(e) => setForm((p) => ({ ...p, IC: e.target.value }))} />

          <label>Kontaktní osoba</label>
          <input value={form.KontaktniOsoba} onChange={(e) => setForm((p) => ({ ...p, KontaktniOsoba: e.target.value }))} />

          <label>Telefon</label>
          <input value={form.Telefon} onChange={(e) => setForm((p) => ({ ...p, Telefon: e.target.value }))} />

          <label>Email</label>
          <input type="email" value={form.Email} onChange={(e) => setForm((p) => ({ ...p, Email: e.target.value }))} />

          <div className="crm-actions-row">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Ukládám...' : 'Uložit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZakaznikForm;
