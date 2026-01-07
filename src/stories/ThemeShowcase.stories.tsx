import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { availableThemes } from '../types/theme';
import { GridCell } from '../components/ui/GridCell';
import './ThemeShowcase.css';

// Theme Showcase Component
const ThemeShowcase: React.FC = () => {
  return (
    <div className="theme-showcase">
      <h1 className="theme-showcase__title">WordPlay Theme Gallery</h1>
      <p className="theme-showcase__subtitle">
        All {availableThemes.length} available themes with sample game elements
      </p>
      
      <div className="theme-showcase__grid">
        {availableThemes.map((theme, index) => (
          <div key={theme.name} className="theme-showcase__card">
            <div 
              className="theme-showcase__preview"
              style={{
                '--theme-surface': theme.colors.surface,
                '--theme-accent': theme.colors.accent,
                '--theme-default': theme.colors.default,
                '--theme-text': theme.colors.text,
                '--theme-background': theme.colors.background,
              } as React.CSSProperties}
            >
              {/* Theme Header */}
              <div className="theme-showcase__header">
                <h3 className="theme-showcase__name">{theme.name}</h3>
                <span className="theme-showcase__index">#{index + 1}</span>
              </div>
              
              {/* Sample Game Elements */}
              <div className="theme-showcase__elements">
                {/* Sample word with key/locked letters */}
                <div className="theme-showcase__word">
                  <GridCell 
                    letter="W" 
                    state="normal" 
                    onClick={() => {}} 
                    disabled={false}
                  />
                  <GridCell 
                    letter="O" 
                    state="key" 
                    onClick={() => {}} 
                    disabled={false}
                  />
                  <GridCell 
                    letter="R" 
                    state="normal" 
                    onClick={() => {}} 
                    disabled={false}
                  />
                  <GridCell 
                    letter="D" 
                    state="locked" 
                    onClick={() => {}} 
                    disabled={false}
                  />
                </div>
                
                {/* Color swatches */}
                <div className="theme-showcase__colors">
                  <div 
                    className="theme-showcase__swatch" 
                    style={{ backgroundColor: theme.colors.background }}
                    title="Background"
                  />
                  <div 
                    className="theme-showcase__swatch" 
                    style={{ backgroundColor: theme.colors.surface }}
                    title="Surface"
                  />
                  <div 
                    className="theme-showcase__swatch" 
                    style={{ backgroundColor: theme.colors.accent }}
                    title="Accent"
                  />
                  <div 
                    className="theme-showcase__swatch" 
                    style={{ backgroundColor: theme.colors.default }}
                    title="Default"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof ThemeShowcase> = {
  title: 'Design System/Theme Showcase',
  component: ThemeShowcase,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive showcase of all available WordPlay themes with sample game elements and color swatches.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeShowcase>;

export const AllThemes: Story = {};

export const ThemeCount: Story = {
  parameters: {
    docs: {
      description: {
        story: `Currently displaying ${availableThemes.length} themes total.`,
      },
    },
  },
};


