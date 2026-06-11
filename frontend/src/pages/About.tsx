import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft, IconBrandLinkedin, IconUsers } from '@tabler/icons-react';
import { Campus360Logo } from '../components/Campus360Logo';
import { TEAM_MEMBERS, TEAM_SCHOOL } from '../config/team';
import { usePageTitle } from '../hooks/usePageTitle';
import './About.css';

function memberInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function TeamPhoto({ name, photoSrc }: { name: string; photoSrc: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="about-page__initials">{memberInitials(name)}</span>;
  }

  return (
    <img
      className="about-page__photo"
      src={photoSrc}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}

export function About() {
  usePageTitle('About us');

  return (
    <div className="about-page">
      <div className="about-page__shell">
        <aside className="about-page__brand">
          <div className="about-page__brand-inner">
            <Link className="about-page__back" to="/login">
              <IconArrowLeft size={14} aria-hidden />
              Back to sign in
            </Link>

            <div className="about-page__logo-wrap">
              <Campus360Logo variant="login" />
            </div>

            <div className="about-page__eyebrow">
              <IconUsers size={13} aria-hidden />
              About Campus360
            </div>

            <h1 className="about-page__title">Built by students, for campus life.</h1>
            <p className="about-page__lead">
              Campus360 is an AI-powered helpdesk and service hub from {TEAM_SCHOOL} that
              routes student concerns to the right offices with less friction.
            </p>
          </div>

          <p className="about-page__brand-footer">© 2026 Campus360 · {TEAM_SCHOOL}</p>
        </aside>

        <main className="about-page__main">
          <div className="about-page__content">
            <h2 className="about-page__section-title">Meet the team</h2>
            <p className="about-page__section-sub">
              Fourth-year BS Applied Mathematics in Data Science students from{' '}
              {TEAM_SCHOOL} who designed and built Campus360.
            </p>

            <div className="about-page__grid">
              {TEAM_MEMBERS.map((member) => (
                <article key={member.id} className="about-page__card">
                  <div className="about-page__photo-wrap">
                    <TeamPhoto name={member.name} photoSrc={member.photoSrc} />
                  </div>
                  <div className="about-page__details">
                    <div className="about-page__name-slot">
                      <h3 className="about-page__name">{member.name}</h3>
                    </div>
                    <div className="about-page__role-slot">
                      {member.roleLabel ? (
                        <span className="about-page__role">{member.roleLabel}</span>
                      ) : null}
                    </div>
                    <p className="about-page__school">{TEAM_SCHOOL}</p>
                    <p className="about-page__course">{member.course}</p>
                    <a className="about-page__email" href={`mailto:${member.email}`}>
                      {member.email}
                    </a>
                    {member.linkedInUrl ? (
                      <a
                        className="about-page__linkedin"
                        href={member.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconBrandLinkedin size={14} aria-hidden />
                        LinkedIn
                      </a>
                    ) : (
                      <span className="about-page__linkedin about-page__linkedin--placeholder" aria-hidden>
                        <IconBrandLinkedin size={14} />
                        LinkedIn
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
