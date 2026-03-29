export function normalizeCustomer(input) {
  const source = input || {};
  return {
    ZakaznikId: Number(source.ZakaznikId || source.zakaznikId || source.ID || 0),
    Nazev: asString(source.Nazev || source.nazev || source.Name || source.name),
    Ulice: asString(source.Ulice || source.ulice || source.Address || source.address),
    IC: asString(source.IC || source.Ico || source.ico || source.ICO),
    KontaktniOsoba: asString(source.KontaktniOsoba || source.kontaktniOsoba || source.Kontakt),
    Telefon: asString(source.Telefon || source.telefon || source.Tel || source.Phone),
    Email: asString(source.Email || source.email || source.Mail),
  };
}

export function normalizeJob(input) {
  const source = input || {};
  return {
    ZakazkaId: Number(source.ZakazkaId || source.zakazkaId || source.ID || 0),
    ZakaznikId: Number(source.ZakaznikId || source.zakaznikId || 0),
    Datum: normalizeDate(source.Datum || source.datum || source.CreatedDate),
    ZamestnanecId: Number(source.ZamestnanecId || source.zamestnanecId || 0),
    FirmaId: Number(source.FirmaId || source.firmaId || 0),
    StatusId: Number(source.StatusId || source.statusId || 0),
    FakturaStatusId: Number(source.FakturaStatusId || source.fakturaStatusId || 0),
    ZpusobPlatbyId: Number(source.ZpusobPlatbyId || source.zpusobPlatbyId || 0),
    SkudceId: Number(source.SkudceId || source.skudceId || 0),
    CisloProtokolu: toNumber(source.CisloProtokolu || source.cisloProtokolu || source.ProtokolCislo || source.protokolCislo),
    Doprava: toNumber(source.Doprava || source.doprava),
    CenaZakazky: toNumber(source.CenaZakazky || source.cenaZakazky),
    OstatniNaklady: toNumber(source.OstatniNaklady || source.ostatniNaklady),
    NazevZakazky: String(source.NazevZakazky || source.nazevZakazky || source.Nazev || 'Nova zakazka'),
    Poznamka: String(source.Poznamka || source.poznamka || source.Popis || source.popis || ''),
    Popis: String(source.Popis || source.popis || source.Poznamka || source.poznamka || ''),
    DatumNaplanovano: normalizeDate(source.Datum_naplanovano || source.datum_naplanovano || source.DatumNaplanovano || source.Datum || source.datum),
    Status: String(source.Status || source.status || source.StatusNazev || 'otevrena'),
    Priorita: asString(source.Priorita || source.priorita),
    Skudce: asString(source.Skudce || source.skudce || source.SkudceNazev),
    NazevZakaznika: asString(source.NazevZakaznika || source.Nazev || source.ZakaznikNazev),
    TechnikEmail: asString(source.TchnikEmail || source.TechnikEmail || source.ZamEmail || source.email),
  };
}

function asString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeDate(value) {
  const s = asString(value);
  if (!s) return null;
  const ten = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ten) ? ten : s;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
