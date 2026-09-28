import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the current login page', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
});
