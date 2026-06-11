import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconLink,
} from '@tabler/icons-react';
import { getMe, type User } from '../api/client';
import { StudentSidebar } from '../components/StudentSidebar';
import { StudentTopbar } from '../components/StudentTopbar';
import '../components/StudentTopbar.css';
import { openCampusPortal, QUICK_LINKS } from '../config/quickLinks';
import { useShellScale } from '../hooks/useShellScale';
import { usePageTitle } from '../hooks/usePageTitle';
import { randomGreeting } from '../utils/greeting';
import './StudentDashboard.css';
import './StudentQuickLinks.css';

export function StudentQuickLinks() {
  const navigate = useNavigate();
  usePageTitle('Quick Links');
  const { outerRef, shellRef } = useShellScale();
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me.user);
        setGreeting(randomGreeting(me.user.name.split(' ')[0]));
      } catch {
        if (!cancelled) {
          navigate('/login');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="student-dashboard">
      <div className="student-dashboard__outer" ref={outerRef}>
        <div className="student-dashboard__shell" ref={shellRef}>
          <StudentSidebar />

          <div className="student-dashboard__main">
            <header className="student-dashboard__topbar">
              <div className="student-dashboard__topbar-left">
                <span className="student-dashboard__greeting">{greeting}</span>
              </div>
              <StudentTopbar user={user} onUserUpdated={setUser} />
            </header>

            <div className="student-quicklinks__content">
              <div className="student-quicklinks__inner">
                <h1 className="student-quicklinks__title">
                  <IconLink size={22} aria-hidden />
                  Quick Links
                </h1>
                <p className="student-quicklinks__subtitle">
                  Campus portals and services in one place.
                </p>
                <div className="student-quicklinks__grid">
                {QUICK_LINKS.map(({ label, icon: Icon, iconColor, bgColor, url }, index) => (
                  <button
                    key={label}
                    type="button"
                    className="student-quicklinks__card c360-stagger"
                    style={{ '--c360-stagger': index } as CSSProperties}
                    onClick={() => {
                      if (url) {
                        openCampusPortal(url, label);
                      }
                    }}
                  >
                    <span
                      className="student-quicklinks__icon"
                      style={{ background: bgColor }}
                    >
                      <Icon size={22} color={iconColor} aria-hidden />
                    </span>
                    <span className="student-quicklinks__label">{label}</span>
                  </button>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
