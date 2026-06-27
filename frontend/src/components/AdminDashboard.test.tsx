import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from './AdminDashboard';

// Mock subcomponents
vi.mock('./Admin/AdminLogin', () => ({
  default: ({ onLoginSuccess, onBack }: any) => (
    <div>
      <span>Mock Admin Login Screen</span>
      <button onClick={() => onLoginSuccess('secret_password')}>Mock Success Login</button>
      <button onClick={onBack}>Mock Back</button>
    </div>
  )
}));

vi.mock('./Admin/ClausesPanel', () => ({
  default: ({ language }: any) => (
    <div>Mock Clauses Panel - Lang: {language}</div>
  )
}));

vi.mock('./Admin/PromptsPanel', () => ({
  default: ({ language }: any) => (
    <div>Mock Prompts Panel - Lang: {language}</div>
  )
}));

describe('AdminDashboard Component', () => {
  const onBackMock = vi.fn();
  const setAdminPasswordMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login screen if adminPassword is not provided', () => {
    render(
      <AdminDashboard
        onBack={onBackMock}
        adminPassword={null}
        setAdminPassword={setAdminPasswordMock}
      />
    );

    expect(screen.getByText('Mock Admin Login Screen')).toBeInTheDocument();

    // Simulate login success trigger from child
    fireEvent.click(screen.getByRole('button', { name: 'Mock Success Login' }));
    expect(setAdminPasswordMock).toHaveBeenCalledWith('secret_password');

    // Simulate back trigger from child
    fireEvent.click(screen.getByRole('button', { name: 'Mock Back' }));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('renders authenticated dashboard when password is provided', () => {
    render(
      <AdminDashboard
        onBack={onBackMock}
        adminPassword="secret_password"
        setAdminPassword={setAdminPasswordMock}
      />
    );

    expect(screen.getByText("Administration de l'Agent")).toBeInTheDocument();
    expect(screen.getByText('Mock Clauses Panel - Lang: fr')).toBeInTheDocument();
    expect(screen.queryByText('Mock Admin Login Screen')).not.toBeInTheDocument();
  });

  it('switches tabs and displays corresponding panel', () => {
    render(
      <AdminDashboard
        onBack={onBackMock}
        adminPassword="secret_password"
        setAdminPassword={setAdminPasswordMock}
      />
    );

    // Initial tab: Clauses Panel
    expect(screen.getByText('Mock Clauses Panel - Lang: fr')).toBeInTheDocument();
    expect(screen.queryByText(/Mock Prompts Panel/)).not.toBeInTheDocument();

    // Click on Prompts tab
    const tabPrompts = screen.getByRole('tab', { name: /Prompts/i });
    fireEvent.click(tabPrompts);

    expect(screen.getByText('Mock Prompts Panel - Lang: fr')).toBeInTheDocument();
    expect(screen.queryByText(/Mock Clauses Panel/)).not.toBeInTheDocument();
  });

  it('toggles language state when clicking buttons', () => {
    render(
      <AdminDashboard
        onBack={onBackMock}
        adminPassword="secret_password"
        setAdminPassword={setAdminPasswordMock}
      />
    );

    // Initial: French
    expect(screen.getByText('Mock Clauses Panel - Lang: fr')).toBeInTheDocument();

    // Click English language toggle
    const toggleEnglish = screen.getByRole('button', { name: /Anglais/i });
    fireEvent.click(toggleEnglish);

    expect(screen.getByText('Mock Clauses Panel - Lang: en')).toBeInTheDocument();
  });

  it('triggers onBack when clicking header back button', () => {
    render(
      <AdminDashboard
        onBack={onBackMock}
        adminPassword="secret_password"
        setAdminPassword={setAdminPasswordMock}
      />
    );

    // Click header back button (it uses ArrowBackIcon)
    // There's only one header icon button in authenticated dashboard
    // Let's retrieve all buttons and click the one with the icon or matching the test
    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});
