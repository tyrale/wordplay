/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders Vite and React logos', () => {
    render(<App />);

    const viteLogo = screen.getByAltText('Vite logo');
    const reactLogo = screen.getByAltText('React logo');

    expect(viteLogo).toBeInTheDocument();
    expect(reactLogo).toBeInTheDocument();
  });

  test('renders main heading', () => {
    render(<App />);

    const heading = screen.getByRole('heading', { name: /vite \+ react/i });
    expect(heading).toBeInTheDocument();
  });

  test('renders initial count as 0', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/i });
    expect(button).toBeInTheDocument();
  });

  test('increments count when button is clicked', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/i });
    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /count is 1/i })
    ).toBeInTheDocument();
  });

  test('increments count multiple times', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: /count is 0/i });

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /count is 3/i })
    ).toBeInTheDocument();
  });

  test('renders learn more text', () => {
    render(<App />);

    const learnText = screen.getByText(
      /Click on the Vite and React logos to learn more/i
    );
    expect(learnText).toBeInTheDocument();
  });
});
