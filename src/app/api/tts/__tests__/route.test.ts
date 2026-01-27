/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock edge-tts
jest.mock('../../../../lib/edge-tts', () => ({
  generateSpeech: jest.fn().mockResolvedValue(Buffer.from('mock audio')),
}));

describe('API Route - /api/tts', () => {
  it('should return audio buffer on success', async () => {
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Test' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    const blob = await response.blob();
    expect(await blob.text()).toBe('mock audio');
  });

  it('should return 400 if text is missing', async () => {
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
