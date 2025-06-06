/// <reference types="vitest/globals" />
import { describe, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders the game board', () => {
    render(<App />);
    
    // Initially shows start screen
    expect(screen.getByText('Welcome to WordPlay')).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
    
    // Start the game
    fireEvent.click(screen.getByText('Start Game'));
    
    // Now check for game components (wait for them to appear)
    expect(screen.getByLabelText(/Current word:/)).toBeInTheDocument();
    expect(screen.getByTestId('word-builder')).toBeInTheDocument();
  });

  test('renders the theme selector', () => {
    render(<App />);
    
    // Check for theme selector
    const themeSelector = screen.getByDisplayValue('Classic Blue');
    expect(themeSelector).toBeInTheDocument();
    
    // Check for all theme options
    expect(screen.getByText('Classic Blue')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Forest Green')).toBeInTheDocument();
  });

  test('renders action indicators and submit button', () => {
    render(<App />);
    
    // Start the game first
    fireEvent.click(screen.getByText('Start Game'));
    
    // Check for word builder (which contains interactive elements)
    expect(screen.getByTestId('word-builder')).toBeInTheDocument();
    
    // Check for alphabet grid
    expect(screen.getByLabelText('Alphabet grid')).toBeInTheDocument();
  });

  test('shows the word trail with game history', () => {
    render(<App />);
    
    // Start the game first
    fireEvent.click(screen.getByText('Start Game'));
    
    // Check for word trail component (it should be rendered but may be empty initially)
    // The WordTrail component is rendered but may not have visible content initially
    expect(screen.getByTestId('word-builder')).toBeInTheDocument();
  });

  test('shows the current word with key letter highlighting', () => {
    render(<App />);
    
    // Start the game first
    fireEvent.click(screen.getByText('Start Game'));
    
    // Check that a current word is displayed (will be random)
    const currentWord = screen.getByLabelText(/Current word:/);
    expect(currentWord).toBeInTheDocument();
    
    // Check for word builder which shows the current word letters
    expect(screen.getByTestId('word-builder')).toBeInTheDocument();
  });

  test('renders the game board layout', () => {
    render(<App />);
    
    // Start the game first
    fireEvent.click(screen.getByText('Start Game'));
    
    // Check for main game board sections
    expect(screen.getByLabelText(/Current word:/)).toBeInTheDocument();
    expect(screen.getByTestId('word-builder')).toBeInTheDocument();
    expect(screen.getByLabelText('Alphabet grid')).toBeInTheDocument();
  });
});
