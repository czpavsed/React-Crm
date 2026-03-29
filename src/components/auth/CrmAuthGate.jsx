import React, { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../../lib/firebase';

const CrmAuthGate = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [auth, setAuth] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    try {
      setAuth(getFirebaseAuth());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Chyba inicializace Firebase');
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return undefined;
    }

    let unsub;
    let cancelled = false;

    (async () => {
      try {
        await auth.setPersistence('local');
      } catch {
        // Pokračuje i bez persistence.
      }

      if (cancelled) return;
      unsub = auth.onAuthStateChanged((u) => {
        setAuthUser(u);
        setAuthReady(true);
        if (u && u.email) setEmail(u.email);
      });
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [auth]);

  const submitAuth = async (event) => {
    event.preventDefault();
    if (!auth) return;
    setAuthError(null);

    try {
      if (authMode === 'register') {
        await auth.createUserWithEmailAndPassword(email.trim(), password);
      } else {
        await auth.signInWithEmailAndPassword(email.trim(), password);
      }
      setPassword('');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Přihlášení se nezdařilo');
    }
  };

  if (!authReady) {
    return (
      <main className="auth-wrap">
        <section className="card auth-card">Načítám aplikaci...</section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="auth-wrap">
        <section className="card auth-card">
          <h2 className="page-header" style={{ marginBottom: 10 }}>CRM Derator s.r.o.</h2>
          <p style={{ marginBottom: 15 }}>Přihlášení používá Firebase identitu.</p>
          <form onSubmit={submitAuth}>
            <div className="form-grid">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

              <label>Heslo</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

              <button className="btn btn-primary" type="submit">
                {authMode === 'register' ? 'Vytvořit účet' : 'Přihlásit'}
              </button>
            </div>
          </form>

          <p className="auth-switch">
            {authMode === 'login' ? 'Nemáte účet?' : 'Už účet máte?'}{' '}
            <button className="auth-switch-link" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Vytvořit účet' : 'Přejít na přihlášení'}
            </button>
          </p>

          {authError ? <p className="auth-error">{authError}</p> : null}
        </section>
      </main>
    );
  }

  const signOut = async () => {
    if (!auth) return;
    await auth.signOut();
  };

  return children({
    email: (authUser.email || email || '').trim(),
    user: authUser,
    signOut,
  });
};

export default CrmAuthGate;
