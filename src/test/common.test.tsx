import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { RatingStars } from '../components/common/RatingStars';
import { PriceDelta } from '../components/common/PriceDelta';
import { Money } from '../components/common/Money';
import { UserAvatar } from '../components/common/UserAvatar';
import { Countdown } from '../components/common/Countdown';
import { CategoryBadge } from '../components/common/CategoryBadge';

const wrap = (ui: ReactNode, locale: 'is' | 'en' = 'is') => render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>);

describe('VerifiedBadge', () => {
  it('renders "Staðfestur" for phone and eid', () => {
    wrap(<VerifiedBadge level="phone" />);
    expect(screen.getByText('Staðfestur')).toBeInTheDocument();
    expect(screen.getByLabelText('Staðfest símanúmer')).toBeInTheDocument();
  });
  it('renders the long label on request and in English', () => {
    wrap(<VerifiedBadge level="eid" long />, 'en');
    expect(screen.getByText('Electronic ID')).toBeInTheDocument();
  });
  it('renders nothing for none unless showUnverified', () => {
    const { container } = wrap(<VerifiedBadge level="none" />);
    expect(container).toBeEmptyDOMElement();
    wrap(<VerifiedBadge level="none" showUnverified />);
    expect(screen.getByText('Óstaðfestur')).toBeInTheDocument();
  });
});

describe('RatingStars', () => {
  it('shows the value with a comma and the count', () => {
    wrap(<RatingStars value={4.87} count={12} />);
    expect(screen.getByText('4,9')).toBeInTheDocument();
    expect(screen.getByText('(12)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Einkunn 4,9 af 5 úr 12 viðskiptum' })).toBeInTheDocument();
  });
  it('shows "Nýr notandi" under three ratings', () => {
    wrap(<RatingStars value={5} count={2} />);
    expect(screen.getByText('Nýr notandi')).toBeInTheDocument();
    expect(screen.queryByText('5,0')).not.toBeInTheDocument();
  });
  it('large variant renders five stars and English decimals', () => {
    wrap(<RatingStars value={4.2} count={10} size="lg" />, 'en');
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rating 4.2 out of 5 from 10 deals' })).toBeInTheDocument();
  });
});

describe('PriceDelta', () => {
  it('below face value', () => {
    const { container } = wrap(<PriceDelta asking={8010} face={8900} />);
    expect(screen.getByText('−10%')).toBeInTheDocument();
    expect(screen.getByText('undir miðaverði')).toBeInTheDocument();
    expect(container.querySelector('[data-kind="below"]')).toHaveClass('text-up');
  });
  it('at face value', () => {
    const { container } = wrap(<PriceDelta asking={8900} face={8900} />);
    expect(screen.getByText('á miðaverði')).toBeInTheDocument();
    expect(container.querySelector('[data-kind="at"]')).toHaveClass('text-muted-foreground');
  });
  it('above face value in English uses the down colour', () => {
    const { container } = wrap(<PriceDelta asking={9345} face={8900} />, 'en');
    expect(screen.getByText('+5%')).toBeInTheDocument();
    expect(screen.getByText('above face value')).toBeInTheDocument();
    expect(container.querySelector('[data-kind="above"]')).toHaveClass('text-down');
  });
  it('renders nothing without a face value', () => {
    const { container } = wrap(<PriceDelta asking={9000} face={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Money', () => {
  it('splits amount and unit', () => {
    wrap(<Money amount={8900} />);
    expect(screen.getByText('8.900')).toBeInTheDocument();
    expect(screen.getByText('kr.')).toBeInTheDocument();
  });
  it('plain and missing', () => {
    wrap(<Money amount={12500} plain />);
    expect(screen.getByText('12.500 kr.')).toBeInTheDocument();
    wrap(<Money amount={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('UserAvatar / CategoryBadge', () => {
  it('renders initials on a placeholder tone', () => {
    wrap(<UserAvatar profile={{ id: 'abc', display_name: 'Guðrún Jóns' }} />);
    const el = screen.getByTestId('avatar-placeholder');
    expect(el).toHaveTextContent('GJ');
    expect(el.className).toMatch(/bg-ph-[1-6]/);
  });
  it('renders the image when set', () => {
    wrap(<UserAvatar profile={{ id: 'abc', display_name: 'Helgi', avatar_url: 'https://x/a.png' }} />);
    expect(screen.getByRole('img', { name: 'Helgi' })).toHaveAttribute('src', 'https://x/a.png');
  });
  it('translates categories', () => {
    wrap(<CategoryBadge category="tonleikar" />);
    expect(screen.getByText('Tónleikar')).toBeInTheDocument();
  });
});

describe('Countdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders mm:ss and fires onExpire once', () => {
    vi.setSystemTime(new Date('2025-11-14T12:00:00Z'));
    const onExpire = vi.fn();
    wrap(<Countdown until="2025-11-14T12:00:05Z" onExpire={onExpire} />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('00:02')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
