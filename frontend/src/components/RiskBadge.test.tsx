import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RiskBadge from './RiskBadge';

describe('RiskBadge Component', () => {
  it('renders correctly for Low risk', () => {
    render(<RiskBadge risk="Low" />);
    const badge = screen.getByText('Risque Faible');
    expect(badge).toBeInTheDocument();
  });

  it('renders correctly for Medium risk', () => {
    render(<RiskBadge risk="Medium" />);
    const badge = screen.getByText('Risque Moyen');
    expect(badge).toBeInTheDocument();
  });

  it('renders correctly for High risk', () => {
    render(<RiskBadge risk="High" />);
    const badge = screen.getByText('Risque Élevé');
    expect(badge).toBeInTheDocument();
  });
});
