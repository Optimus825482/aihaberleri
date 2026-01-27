/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock edge-tts
jest.mock('../../../../lib/edge-tts', () => ({
  generateSpeech: jest.fn().mockResolvedValue({ 
    audio: Buffer.from('mock audio'), 
    metadata: [{ text: 'mock', start: 0, duration: 1 }] 
  }),
}));

describe('API Route - /api/tts', () => {
  it('should return json with audio and metadata on success', async () => {
    const req = new NextRequest('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Test' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.audio).toBe(Buffer.from('mock audio').toString('base64'));
    expect(data.metadata).toHaveLength(1);
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