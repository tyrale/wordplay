/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders the game board', () => {
    render(<App />);
    
    // Check for key components with updated aria-labels
    expect(screen.getByLabelText('Current word: HIPS')).toBeInTheDocument();
    expect(screen.getByLabelText('Game word history')).toBeInTheDocument();
    expect(screen.getByLabelText('Submit word')).toBeInTheDocument();
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

  it('shows the word trail with game history', () => {
    render(<App />);
    
    // Check for word trail with new structure
    expect(screen.getByLabelText('Game word history')).toBeInTheDocument();
    
    // Check for individual words in the trail
    expect(screen.getByLabelText('Word: PLAY')).toBeInTheDocument();
    expect(screen.getByLabelText('Word: LAPS')).toBeInTheDocument();
    expect(screen.getByLabelText('Word: SLIP')).toBeInTheDocument();
  });

  it('shows the current word with key letter highlighting', () => {
    render(<App />);
    
    // Check that the word HIPS is displayed
    const currentWord = screen.getByLabelText('Current word: HIPS');
    expect(currentWord).toBeInTheDocument();
    
    // Check that H is highlighted as a key letter
    expect(screen.getByLabelText('H key letter')).toBeInTheDocument();
  });

  it('renders the game board layout', () => {
    render(<App />);
    
    // Check for main game board sections
    expect(screen.getByLabelText('Game word history')).toBeInTheDocument();
    expect(screen.getByLabelText('Current word: HIPS')).toBeInTheDocument();
    expect(screen.getByLabelText('Score: 3 points')).toBeInTheDocument();
  });
});
