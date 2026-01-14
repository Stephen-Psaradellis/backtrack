'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  children: React.ReactNode;
  tableOfContents?: TableOfContentsItem[];
}

export function LegalPageLayout({
  title,
  lastUpdated,
  effectiveDate,
  children,
  tableOfContents,
}: LegalPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted transition-colors min-touch-target flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 lg:flex lg:gap-8">
        {/* Table of Contents - Desktop Sidebar */}
        {tableOfContents && tableOfContents.length > 0 && (
          <aside className="hidden lg:block lg:w-64 lg:shrink-0">
            <nav className="sticky top-24">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                Contents
              </h2>
              <ul className="space-y-2">
                {tableOfContents.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block text-sm text-muted-foreground hover:text-foreground transition-colors ${
                        item.level === 2 ? 'pl-0' : 'pl-4'
                      }`}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Document Header */}
          <div className="mb-8 pb-8 border-b border-border">
            <h1 className="text-3xl font-bold mb-4">{title}</h1>
            <p className="text-lg font-medium text-primary mb-2">Backtrack</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Last Updated:</strong> {lastUpdated}</p>
              <p><strong>Effective Date:</strong> {effectiveDate}</p>
            </div>
          </div>

          {/* Legal Content */}
          <article className="legal-content prose prose-neutral max-w-none">
            {children}
          </article>
        </main>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        .legal-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          scroll-margin-top: 5rem;
        }

        .legal-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--foreground);
        }

        .legal-content p {
          margin-bottom: 1rem;
          line-height: 1.75;
          color: var(--foreground);
        }

        .legal-content ul,
        .legal-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .legal-content li {
          margin-bottom: 0.5rem;
          line-height: 1.75;
        }

        .legal-content strong {
          font-weight: 600;
          color: var(--foreground);
        }

        .legal-content a {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .legal-content a:hover {
          color: var(--primary-dark);
        }

        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.875rem;
        }

        .legal-content th,
        .legal-content td {
          padding: 0.75rem 1rem;
          border: 1px solid var(--border);
          text-align: left;
        }

        .legal-content th {
          background-color: var(--muted);
          font-weight: 600;
        }

        .legal-content tr:nth-child(even) {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .legal-content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }

        .legal-content blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: var(--muted-foreground);
          font-style: italic;
        }

        .legal-content .all-caps {
          text-transform: uppercase;
        }

        @media print {
          header {
            display: none;
          }

          aside {
            display: none;
          }

          .legal-content {
            font-size: 12pt;
          }

          .legal-content h2 {
            page-break-after: avoid;
          }

          .legal-content table {
            page-break-inside: avoid;
          }
        }

        @media (prefers-color-scheme: dark) {
          .legal-content tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.02);
          }
        }
      `}</style>
    </div>
  );
}

// Reusable section components
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function LegalSubsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h3>{title}</h3>
      {children}
    </>
  );
}

export function LegalList({
  items,
  ordered = false,
}: {
  items: (string | React.ReactNode)[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <ListTag>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ListTag>
  );
}

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <table>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ContactInfo({
  email,
  address,
}: {
  email: string;
  address?: string[];
}) {
  return (
    <div className="my-4">
      <p>
        <strong>Email:</strong>{' '}
        <a href={`mailto:${email}`}>{email}</a>
      </p>
      {address && (
        <p className="mt-2">
          <strong>Mailing Address:</strong>
          <br />
          {address.map((line, index) => (
            <span key={index}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
