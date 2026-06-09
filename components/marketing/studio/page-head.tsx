import type { ReactNode } from 'react';
import Link from 'next/link';

export function PageHead({
  crumb,
  title,
  lede,
}: {
  crumb: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/">Studio</Link>
          <span className="sep">/</span>
          <span>{crumb}</span>
        </div>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
    </section>
  );
}
