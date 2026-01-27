import React from 'react';
import { render, screen } from '@testing-library/react';
import { HighlightedText } from '../HighlightedText';

// Mock Audio Context values
jest.mock('../../../context/AudioContext', () => {
  return {
    useAudio: () => ({
      currentWordIndex: 1,
      metadata: [
        { text: 'Merhaba', start: 0, duration: 1 },
        { text: 'Dünya', start: 1, duration: 1 },
      ],
      title: 'Test Title',
      isPlaying: true,
    }),
  };
});

describe('HighlightedText', () => {
  it('renders words as spans when active', () => {
    render(
      <HighlightedText htmlContent="<p>Merhaba Dünya</p>" articleTitle="Test Title" />
    );

    expect(screen.getByText('Merhaba')).toBeInTheDocument();
    expect(screen.getByText('Dünya')).toBeInTheDocument();
  });

  it('applies highlight class to current word', () => {
    render(
      <HighlightedText htmlContent="<p>Merhaba Dünya</p>" articleTitle="Test Title" />
    );

    const highlightedWord = screen.getByText('Dünya');
    expect(highlightedWord).toHaveClass('bg-yellow-200');
  });
});