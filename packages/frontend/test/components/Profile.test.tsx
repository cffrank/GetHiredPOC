import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../../src/pages/Profile';
import { AuthProvider } from '../../src/context/AuthContext';

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Profile', () => {
  it('renders the profile page heading', async () => {
    renderWithProviders(<Profile />);
    const heading = await screen.findByRole('heading', { name: /profile/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders the user email from auth context', async () => {
    renderWithProviders(<Profile />);
    // The email from the MSW /api/auth/me handler is 'test@example.com'
    const email = await screen.findByText('test@example.com');
    expect(email).toBeInTheDocument();
  });

  it('renders the user full name', async () => {
    renderWithProviders(<Profile />);
    // full_name from MSW handler is 'Test User'
    const name = await screen.findByText('Test User');
    expect(name).toBeInTheDocument();
  });

  it('renders the Your Information section', async () => {
    renderWithProviders(<Profile />);
    const section = await screen.findByText('Your Information');
    expect(section).toBeInTheDocument();
  });

  it('renders the Quick Import section', async () => {
    renderWithProviders(<Profile />);
    const section = await screen.findByText('Quick Import');
    expect(section).toBeInTheDocument();
  });
});
