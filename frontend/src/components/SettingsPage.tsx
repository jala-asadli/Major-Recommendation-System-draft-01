import { useEffect, useState, type FormEvent } from 'react';
import type { UserProfile } from '../types';

interface SettingsPageProps {
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
  }) => void;
}

export const SettingsPage = ({ user, settings, onSave }: SettingsPageProps) => {
  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname);
  const [username, setUsername] = useState(settings.username);
  const [birthDate, setBirthDate] = useState(settings.birthDate);
  const [gender, setGender] = useState(settings.gender);
  const [email, setEmail] = useState(settings.email);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user.name);
    setSurname(user.surname);
    setUsername(settings.username);
    setBirthDate(settings.birthDate);
    setGender(settings.gender);
    setEmail(settings.email);
  }, [settings.birthDate, settings.email, settings.gender, settings.username, user.name, user.surname]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      name: name.trim(),
      surname: surname.trim(),
      username: username.trim(),
      birthDate,
      gender,
      email: email.trim()
    });
    setMessage('Settings saved.');
  };

  return (
    <section className="quiz-shell auth-page-section">
      <div className="quiz-card settings-card">
        <header>
          <p className="results-label">Settings</p>
          <h1>Edit Profile</h1>
        </header>

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

          <button type="submit" className="primary-button">
            Save Changes
          </button>
        </form>
      </div>
    </section>
  );
};
