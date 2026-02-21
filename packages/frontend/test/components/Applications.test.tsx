import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import Applications from '../../src/pages/Applications';
import { AuthProvider } from '../../src/context/AuthContext';
import { server } from '../msw/server';

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

describe('Applications', () => {
  it('renders the Application Tracker heading', async () => {
    renderWithProviders(<Applications />);
    const heading = await screen.findByRole('heading', { name: /application tracker/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders application cards with job title and company', async () => {
    renderWithProviders(<Applications />);
    // The MSW default handler returns one application with job title 'Software Engineer'
    const title = await screen.findByText('Software Engineer');
    expect(title).toBeInTheDocument();
    const company = await screen.findByText('Acme Corp');
    expect(company).toBeInTheDocument();
  });

  it('renders all status column headers', async () => {
    renderWithProviders(<Applications />);
    // Applications renders kanban columns for each status
    const savedCol = await screen.findByText(/Saved \(/);
    expect(savedCol).toBeInTheDocument();
    const appliedCol = await screen.findByText(/Applied \(/);
    expect(appliedCol).toBeInTheDocument();
  });

  it('shows empty state message when no applications exist', async () => {
    server.use(
      http.get('http://localhost:8787/api/applications', () => {
        return HttpResponse.json({ applications: [] });
      })
    );
    renderWithProviders(<Applications />);
    const emptyMessage = await screen.findByText(/no applications yet/i);
    expect(emptyMessage).toBeInTheDocument();
  });
});
