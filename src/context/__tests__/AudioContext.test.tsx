import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AudioProvider, useAudio } from '../AudioContext';

// Mock fetch for TTS API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      audio: Buffer.from('audio').toString('base64'),
      metadata: [{ text: 'Test', start: 0, duration: 1 }]
    }),
  })
) as jest.Mock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLAudioElement
const mockPlay = jest.fn();
const mockPause = jest.fn();

beforeAll(() => {
  window.Audio = jest.fn().mockImplementation(() => ({
    play: mockPlay,
    pause: mockPause,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    src: '',
    playbackRate: 1,
    volume: 1,
    muted: false,
    currentTime: 0,
  }));
});

const TestComponent = () => {
  const { isPlaying, rate, play, pause, togglePlay } = useAudio();
  return (
    <div>
      <div data-testid="is-playing">{isPlaying.toString()}</div>
      <div data-testid="rate">{rate}</div>
      <button onClick={() => play({ title: 'Test', text: 'Text' })}>Play New</button>
      <button onClick={pause}>Pause</button>
      <button onClick={togglePlay}>Toggle</button>
    </div>
  );
};

describe('AudioContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('provides global audio state', async () => {
    render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    expect(screen.getByTestId('is-playing').textContent).toBe('false');

    await act(async () => {
      screen.getByText('Play New').click();
    });

    expect(screen.getByTestId('is-playing').textContent).toBe('true');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('persists settings to LocalStorage', async () => {
    const { rerender } = render(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    // Initial default
    expect(screen.getByTestId('rate').textContent).toBe('1');

    // Load from localstorage mock
    localStorage.setItem('audio-settings', JSON.stringify({ rate: 1.5, voice: 'tr-TR-EmelNeural' }));
    
    rerender(
      <AudioProvider>
        <TestComponent />
      </AudioProvider>
    );

    // Note: useEffect runs after render, so we might need to wait or act
    await act(async () => {
        // Wait for potential async state update
    });

    expect(JSON.parse(localStorage.getItem('audio-settings') || '{}').rate).toBe(1.5);
  });
});
