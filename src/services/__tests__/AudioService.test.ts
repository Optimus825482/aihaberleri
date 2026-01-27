import { AudioService } from '../AudioService';

// Mock Web Speech API
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockGetVoices = jest.fn();

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: mockPause,
    resume: mockResume,
    getVoices: mockGetVoices,
    paused: false,
    speaking: false,
    onvoiceschanged: null,
  },
});

class MockSpeechSynthesisUtterance {
  text: string;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onboundary: ((event: any) => void) | null;

  constructor(text: string) {
    this.text = text;
    this.rate = 1;
    this.voice = null;
    this.onend = null;
    this.onboundary = null;
  }
}

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: MockSpeechSynthesisUtterance,
});

describe('AudioService', () => {
  let audioService: AudioService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVoices.mockReturnValue([
      { name: 'Voice 1', lang: 'en-US', default: true } as SpeechSynthesisVoice,
      { name: 'Voice 2', lang: 'en-US', default: false } as SpeechSynthesisVoice,
    ]);
    audioService = new AudioService();
  });

  it('plays text', () => {
    audioService.play('Hello world');
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledWith(expect.any(MockSpeechSynthesisUtterance));
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Hello world');
  });

  it('pauses playback', () => {
    audioService.pause();
    expect(mockPause).toHaveBeenCalled();
  });

  it('resumes playback', () => {
    audioService.resume();
    expect(mockResume).toHaveBeenCalled();
  });

  it('stops playback', () => {
    audioService.stop();
    expect(mockCancel).toHaveBeenCalled();
  });

  it('sets rate', () => {
    audioService.setRate(1.5);
    audioService.play('Test');
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.rate).toBe(1.5);
  });
});
