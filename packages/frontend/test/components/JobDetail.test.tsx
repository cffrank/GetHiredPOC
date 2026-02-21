import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import JobDetail from '../../src/pages/JobDetail';
import { AuthProvider } from '../../src/context/AuthContext';
import { server } from '../msw/server';

function renderWithProviders(ui: React.ReactElement, { route = '/jobs/job-1' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path="/jobs/:id" element={ui} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('JobDetail', () => {
  it('renders job title and company', async () => {
    renderWithProviders(<JobDetail />);
    const title = await screen.findByText('Software Engineer');
    expect(title).toBeInTheDocument();
    const company = await screen.findByText('Acme Corp');
    expect(company).toBeInTheDocument();
  });

  it('renders the job description', async () => {
    renderWithProviders(<JobDetail />);
    const description = await screen.findByText(/skilled software engineer/i);
    expect(description).toBeInTheDocument();
  });

  it('renders parsed requirements from JSON string', async () => {
    renderWithProviders(<JobDetail />);
    const requirement = await screen.findByText('3+ years of React experience');
    expect(requirement).toBeInTheDocument();
  });

  it('handles malformed requirements JSON gracefully (safeParseJSON)', async () => {
    server.use(
      http.get('http://localhost:8787/api/jobs/:id', () => {
        return HttpResponse.json({
          job: {
            id: 'job-1',
            title: 'Frontend Developer',
            company: 'Beta Corp',
            location: 'Remote',
            description: 'A great opportunity.',
            requirements: 'not valid json',
            remote: 1,
            salary_min: null,
            salary_max: null,
            created_at: 1700000000,
            updated_at: 1700000000,
          },
          saved: false,
        });
      })
    );
    // Should render without crashing; safeParseJSON returns [] for malformed JSON
    renderWithProviders(<JobDetail />);
    const title = await screen.findByText('Frontend Developer');
    expect(title).toBeInTheDocument();
    // Requirements section should not crash — no requirements listed (empty array from safeParseJSON)
    expect(screen.queryByText('Requirements')).not.toBeInTheDocument();
  });

  it('renders save and apply buttons', async () => {
    renderWithProviders(<JobDetail />);
    const saveBtn = await screen.findByRole('button', { name: /save/i });
    expect(saveBtn).toBeInTheDocument();
    const applyBtn = await screen.findByRole('button', { name: /apply now/i });
    expect(applyBtn).toBeInTheDocument();
  });
});
