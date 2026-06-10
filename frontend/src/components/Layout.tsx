import { Outlet, Link } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          AIC26
        </Link>
        <nav className="layout__nav">
          <Link to="/">Home</Link>
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
