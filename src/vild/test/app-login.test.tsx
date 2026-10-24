import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import LoginPage from '../app/pages/LoginPage';
import { freshApi, renderAt } from './setup-helpers';

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // input-otp measures its slots; jsdom has no ResizeObserver
    (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
    // …and its password-manager badge probe uses elementFromPoint
    document.elementFromPoint = () => null;
  });

  it('phone → code → session, then lands on onboarding the first time', async () => {
    const api = freshApi();
    renderAt(
      '/vild/app/innskraning',
      '*',
      <Routes>
        <Route path="/vild/app/innskraning" element={<LoginPage />} />
        <Route path="/vild/app/byrja" element={<p>ONBOARDING</p>} />
        <Route path="/vild/app" element={<p>HOME</p>} />
      </Routes>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Símanúmer' }));
    const phone = await screen.findByLabelText('Símanúmer');
    fireEvent.change(phone, { target: { value: '6661234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senda kóða' }));
    const otp = await screen.findByLabelText('Staðfestingarkóði');
    expect(screen.getByText(/Prufukóði/)).toBeInTheDocument();
    fireEvent.change(otp, { target: { value: '123456' } });
    await waitFor(async () => expect((await api.getSession())?.kind).toBe('consumer'));
    await screen.findByText('ONBOARDING');
  });

  it('rejects a wrong code with a message', async () => {
    freshApi();
    renderAt('/vild/app/innskraning', '/vild/app/innskraning', <LoginPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Símanúmer' }));
    fireEvent.change(await screen.findByLabelText('Símanúmer'), { target: { value: '6661234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senda kóða' }));
    fireEvent.change(await screen.findByLabelText('Staðfestingarkóði'), { target: { value: '000000' } });
    await screen.findByText('Rangur kóði. Reyndu aftur.');
  });

  it('goes straight home when already onboarded', async () => {
    localStorage.setItem('vild-onboarded', '1');
    freshApi();
    renderAt(
      '/vild/app/innskraning',
      '*',
      <Routes>
        <Route path="/vild/app/innskraning" element={<LoginPage />} />
        <Route path="/vild/app" element={<p>HOME</p>} />
      </Routes>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Rafræn skilríki' }));
    expect(await screen.findByText('Opna Auðkenni…')).toBeInTheDocument();
    await screen.findByText('HOME', {}, { timeout: 4000 });
  });
});
