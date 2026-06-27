import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FlagIcon from './FlagIcon';

describe('FlagIcon Component', () => {
  it('renders French flag correctly', () => {
    const { container } = render(<FlagIcon country="FR" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 3 2');

    // FR flag has 3 rect elements
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(3);
    expect(rects[0]).toHaveAttribute('fill', '#002395');
    expect(rects[1]).toHaveAttribute('fill', '#FFFFFF');
    expect(rects[2]).toHaveAttribute('fill', '#ED2939');
  });

  it('renders British flag correctly', () => {
    const { container } = render(<FlagIcon country="GB" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 60 30');

    // GB flag has path elements and clipPath
    expect(container.querySelector('clipPath')).toBeInTheDocument();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies custom style correctly', () => {
    const customStyle = { opacity: 0.5, border: '1px solid red' };
    const { container } = render(<FlagIcon country="FR" style={customStyle} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveStyle('opacity: 0.5');
  });
});
