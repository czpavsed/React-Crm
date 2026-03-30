import React, { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../../lib/firebase';
import logo from '../../assets/images/logo.png';

const ALLOWED_EMAIL_DOMAIN = '@derator.cz';

const isAllowedDomainEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  return email.endsWith(ALLOWED_EMAIL_DOMAIN);
};

const CrmAuthGate = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [auth, setAuth] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    try {
      setAuth(getFirebaseAuth());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Nepodařilo se inicializovat přihlášení');
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

    const normalizedEmail = email.trim();

    if (!isAllowedDomainEmail(normalizedEmail)) {
      setAuthError('Přístup je povolen pouze pro firemní e-mail @derator.cz.');
      return;
    }

    if (authMode === 'register') {
      if (password.length < 6) {
        setAuthError('Heslo musí mít alespoň 6 znaků.');
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Hesla se neshodují. Zkontrolujte potvrzení hesla.');
        return;
      }
    }

    try {
      if (authMode === 'register') {
        await auth.createUserWithEmailAndPassword(normalizedEmail, password);
      } else {
        await auth.signInWithEmailAndPassword(normalizedEmail, password);
      }
      setPassword('');
      setConfirmPassword('');
    } catch (e) {
      const message = e instanceof Error ? String(e.message || '') : '';
      if (/invalid-email/i.test(message)) {
        setAuthError('Neplatný formát e-mailu.');
      } else if (/wrong-password|invalid-credential/i.test(message)) {
        setAuthError('Nesprávný e-mail nebo heslo.');
      } else if (/email-already-in-use/i.test(message)) {
        setAuthError('Tento e-mail už je zaregistrován.');
      } else {
        setAuthError(e instanceof Error ? e.message : 'Přihlášení se nezdařilo');
      }
    }
  };

  if (!authReady) {
    return (
      <main className="auth-wrap theme-mode-dark theme-color-orange">
        <section className="card auth-card">Načítám aplikaci...</section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="auth-wrap theme-mode-dark theme-color-orange">
        <section className="card auth-card">
          <div className="auth-card__logo-wrap">
            <img src={logo} alt="Derator" className="auth-card__logo" />
          </div>
          <p className="auth-card__subtitle">{authMode === 'login' ? 'Přihlášení do CRM' : 'Registrace nového účtu do CRM'}</p>
          <form onSubmit={submitAuth}>
            <div className="form-grid">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />

              <label>Heslo</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} />

              {authMode === 'register' ? (
                <>
                  <label>Potvrzení hesla</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Zadejte heslo znovu"
                  />
                </>
              ) : null}

              <button className="btn btn-primary" type="submit">
                {authMode === 'register' ? 'Vytvořit účet' : 'Přihlásit'}
              </button>
            </div>
          </form>

          <p className="auth-switch">
            {authMode === 'login' ? 'Nemáte účet?' : 'Už účet máte?'}{' '}
            <button
              className="auth-switch-link"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setPassword('');
                setConfirmPassword('');
                setAuthError(null);
              }}
            >
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
