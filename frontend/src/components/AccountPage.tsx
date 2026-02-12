import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { buildApiUrl } from '../config';
import type { UserProfile } from '../types';
import { Footer } from './Footer';

interface AccountPageProps {
  user: UserProfile;
  settings: {
    username: string;
    birthDate: string;
    gender: string;
    email: string;
  };
  onSave: (payload: {
    name: string;
    surname: string;
    username: string;
    birthDate: string;
    gender: string;
    email: string;
  }) => Promise<void>;
}

type AccountProfile = {
  full_name: string;
  username: string;
  email: string;
  birthdate: string;
  gender: string;
  completed_tests: number;
};

const EMPTY_FIELD_COPY = 'Məlumat əlavə edilməyib';

export const AccountPage = ({ user, settings, onSave }: AccountPageProps) => {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname);
  const [username, setUsername] = useState(settings.username);
  const [birthDate, setBirthDate] = useState(settings.birthDate);
  const [gender, setGender] = useState(settings.gender);
  const [email, setEmail] = useState(settings.email);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const response = await fetch(buildApiUrl(`/api/users/${user.id}/profile`));
    if (!response.ok) {
      throw new Error('Unable to load account profile.');
    }
    const payload = await response.json();
    const nextProfile = payload?.profile;
    if (!nextProfile || typeof nextProfile !== 'object') {
      throw new Error('Malformed profile payload.');
    }
    setProfile({
      full_name: typeof nextProfile.full_name === 'string' ? nextProfile.full_name : '',
      username: typeof nextProfile.username === 'string' ? nextProfile.username : '',
      email: typeof nextProfile.email === 'string' ? nextProfile.email : '',
      birthdate: typeof nextProfile.birthdate === 'string' ? nextProfile.birthdate : '',
      gender: typeof nextProfile.gender === 'string' ? nextProfile.gender : '',
      completed_tests: Number.isFinite(nextProfile.completed_tests) ? Number(nextProfile.completed_tests) : 0
    });
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        await loadProfile();
      } catch {
        if (!cancelled) {
          setProfile({
            full_name: '',
            username: '',
            email: '',
            birthdate: '',
            gender: '',
            completed_tests: Number.NaN
          });
        }
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  useEffect(() => {
    setName(user.name);
    setSurname(user.surname);
  }, [user.name, user.surname]);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || '');
    setBirthDate(profile.birthdate || '');
    setGender(profile.gender || '');
    setEmail(profile.email || '');
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setErrorMessage('');
    try {
      await onSave({
        name: name.trim(),
        surname: surname.trim(),
        username: username.trim(),
        birthDate,
        gender,
        email: email.trim()
      });
      await loadProfile();
      setIsEditing(false);
      setMessage('Settings saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayFullName = profile?.full_name?.trim() || `${user.name} ${user.surname}`.trim();
  const safeText = (value: string) => (value?.trim() ? value.trim() : EMPTY_FIELD_COPY);
  const completedTestsText =
    typeof profile?.completed_tests === 'number' && profile.completed_tests >= 0
      ? String(profile.completed_tests)
      : EMPTY_FIELD_COPY;
  const handleStartEditing = () => {
    setMessage('');
    setErrorMessage('');
    setIsEditing(true);
  };

  return (
    <section className="home-page-shell home home-new-page">
      <div className="home-user-shell account-profile-page">
        <div className="home-user-bg-left" aria-hidden="true" />
        <div className="home-user-bg-right" aria-hidden="true" />

        <div className="home-container home-user-layout account-profile-layout">
          <header className="home-user-hero account-profile-hero">
            <span className="home-user-pill">Profil</span>
            <h1>Xoş gəlmisiniz, {displayFullName} 👋</h1>
            <p>Hesab məlumatlarınızı yoxlayın və yeniləyin.</p>
          </header>

          <article className="home-user-result-card account-profile-card">
            {!isEditing ? (
              <>
                <dl className="account-grid account-profile-grid">
                  <div>
                    <dt>Ad və Soyad</dt>
                    <dd>{safeText(profile?.full_name || '')}</dd>
                  </div>
                  <div>
                    <dt>İstifadəçi adı</dt>
                    <dd>{safeText(profile?.username || '')}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{safeText(profile?.email || '')}</dd>
                  </div>
                  <div>
                    <dt>Doğum tarixi</dt>
                    <dd>{safeText(profile?.birthdate || '')}</dd>
                  </div>
                  <div>
                    <dt>Cins</dt>
                    <dd>{safeText(profile?.gender || '')}</dd>
                  </div>
                  <div>
                    <dt>Tamamlanmış testlər</dt>
                    <dd>{completedTestsText}</dd>
                  </div>
                </dl>

                <div className="account-actions">
                  <button type="button" className="primary-button" onClick={handleStartEditing}>
                    Profilimi redaktə et
                  </button>
                </div>
              </>
            ) : (
              <form className="settings-form" onSubmit={handleSubmit}>
                <label className="input-label">
                  <span>First Name</span>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
                </label>

                <label className="input-label">
                  <span>Last Name</span>
                  <input type="text" value={surname} onChange={(event) => setSurname(event.target.value)} />
                </label>

                <label className="input-label">
                  <span>Username</span>
                  <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} />
                </label>

                <label className="input-label">
                  <span>Email</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>

                <label className="input-label">
                  <span>Birth Date</span>
                  <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
                </label>

                <label className="input-label">
                  <span>Gender</span>
                  <select value={gender} onChange={(event) => setGender(event.target.value)}>
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                {message && <p className="info-text">{message}</p>}
                {errorMessage && <p className="info-text" role="alert">{errorMessage}</p>}

                <div className="account-actions">
                  <button type="button" className="ghost-button" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>
      </div>

      <Footer startTestPath="/test" />
    </section>
  );
};
