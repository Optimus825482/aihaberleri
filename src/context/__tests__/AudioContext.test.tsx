import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AudioProvider, useAudio } from '../AudioContext';

// Mock child component to test hook
const TestComponent = () => {
  const { isPlaying, rate, voice, play, pause, setRate, setVoice } = useAudio();
  return (
    <div>
      <div data-testid="is-playing">{isPlaying.toString()}</div>
      <div data-testid="rate">{rate}</div>
      <div data-testid="voice">{voice}</div>
      <button onClick={play}>Play</button>
      <button onClick={pause}>Pause</button>
      <button onClick={() => setRate(1.5)}>Set Rate</button>
      <button onClick={() => setVoice('female')}>Set Voice</button>
    </div>
  );
};

describe('AudioContext', () => {
  it('provides default values', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    expect(screen.getByTestId('is-playing').textContent).toBe('false');
    expect(screen.getByTestId('rate').textContent).toBe('1');
    expect(screen.getByTestId('voice').textContent).toBe('male');
  });

  it('updates state when methods are called', () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    act(() => {
      screen.getByText('Play').click();
    });
    expect(screen.getByTestId('is-playing').textContent).toBe('true');

    act(() => {
      screen.getByText('Pause').click();
    });
    expect(screen.getByTestId('is-playing').textContent).toBe('false');

    act(() => {
      screen.getByText('Set Rate').click();
    });
    expect(screen.getByTestId('rate').textContent).toBe('1.5');
    
    act(() => {
        screen.getByText('Set Voice').click();
    });
    expect(screen.getByTestId('voice').textContent).toBe('female');
  });
});
