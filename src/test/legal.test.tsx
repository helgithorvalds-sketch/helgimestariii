import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import LegalPage from '../pages/LegalPage';
import { privacyDoc, termsDoc } from '../content/legal';

function wrap(doc: 'terms' | 'privacy', locale: 'is' | 'en' = 'is') {
  return render(
    <MemoryRouter>
      <I18nProvider initialLocale={locale}>
        <LegalPage doc={doc} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('legal texts', () => {
  it('Icelandic and English have the same sections in the same order', () => {
    for (const make of [termsDoc, privacyDoc]) {
      expect(make('en').sections.map((s) => s.id)).toEqual(make('is').sections.map((s) => s.id));
    }
  });

  it('the terms state the face-value cap, that Miðatorg holds no money and is not tix.is', () => {
    const text = JSON.stringify(termsDoc('is'));
    expect(text).toContain('aldrei vera hærra en upprunalegt miðaverð');
    expect(text).toContain('geymir aldrei peninga');
    expect(text).toContain('hvorki á vegum tix.is');
  });
});

describe('LegalPage', () => {
  it('renders the terms with a table of contents and a marked operator placeholder', () => {
    wrap('terms');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Skilmálar Miðatorgs');
    const toc = screen.getByRole('navigation', { name: 'Efnisyfirlit' });
    expect(within(toc).getByRole('link', { name: '3. Að selja miða' })).toHaveAttribute('href', '#sala');
    expect(screen.getByText(/Rekstraraðili: \[fyllist út\]/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lesa persónuverndarstefnuna' })).toHaveAttribute('href', '/personuvernd');
    expect(document.title).toContain('Skilmálar Miðatorgs');
  });

  it('renders the privacy policy in English', () => {
    wrap('privacy', 'en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy policy');
    expect(screen.getByText(/hosted in Ireland in the EEA/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read the terms' })).toHaveAttribute('href', '/skilmalar');
  });
});
