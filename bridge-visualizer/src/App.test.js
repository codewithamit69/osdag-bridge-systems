import { render, screen } from '@testing-library/react';

jest.mock('react-plotly.js', () => {
  return function MockPlot() {
    return null;
  };
});

import App from './App';

test('renders title', () => {
  render(<App />);
  expect(screen.getByText(/Osdag-Inspired Bridge Analysis/i)).toBeInTheDocument();
});
