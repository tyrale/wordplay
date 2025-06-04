/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the game board', () => {
    render(<App />);
    
    // Check for key components
    expect(screen.getByLabelText('Alphabet grid')).toBeInTheDocument();
    expect(screen.getByLabelText('Current word: HIPS')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous words played')).toBeInTheDocument();
  });

  it('renders the theme selector', () => {
    render(<App />);
    
    // Check for theme selector
    const themeSelector = screen.getByRole('combobox');
    expect(themeSelector).toBeInTheDocument();
    
    // Check for theme options
    expect(screen.getByText('Classic Blue')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('Forest Green')).toBeInTheDocument();
  });

  it('renders action indicators and submit button', () => {
    render(<App />);
    
    // Check for submit button
    expect(screen.getByLabelText('Submit word')).toBeInTheDocument();
    
    // Check for action indicators
    expect(screen.getByLabelText('Letter added')).toBeInTheDocument();
    expect(screen.getByLabelText('Letters moved')).toBeInTheDocument();
  });

  it('renders all letter buttons in the alphabet grid', () => {
    render(<App />);
    
    // Check for some letter buttons
    expect(screen.getByLabelText('Letter A')).toBeInTheDocument();
    expect(screen.getByLabelText('Letter H')).toBeInTheDocument();
    expect(screen.getByLabelText('Letter Z')).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByLabelText('Return to home screen')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings menu')).toBeInTheDocument();
  });

  it('can interact with letter buttons', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<App />);
    
    const letterA = screen.getByLabelText('Letter A');
    fireEvent.click(letterA);
    
    expect(consoleSpy).toHaveBeenCalledWith('Letter clicked:', 'A');
    
    consoleSpy.mockRestore();
  });

  it('shows the current word with key letter highlighting', () => {
    render(<App />);
    
    // Check that the word HIPS is displayed
    const currentWord = screen.getByLabelText('Current word: HIPS');
    expect(currentWord).toBeInTheDocument();
    
    // Check that H is highlighted as a key letter
    expect(screen.getByLabelText('H key letter')).toBeInTheDocument();
  });
});
