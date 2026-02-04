import { NextRequest } from 'next/server';
import Redis from 'ioredis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events endpoint for real-time agent activity
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const subscriber = new Redis(redisUrl);

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial connection confirmation
      sendEvent({
        type: 'connection',
        message: 'Connected to agent feed',
        timestamp: new Date().toISOString(),
      });

      // Subscribe to the agent_logs channel that BaseAgent publishes to
      await subscriber.subscribe('agent_logs');

      subscriber.on('message', (_channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          sendEvent(data);
        } catch {
          // ignore malformed messages
        }
      });

      // Cleanup when the client disconnects
      request.signal.addEventListener('abort', () => {
        subscriber.unsubscribe('agent_logs');
        subscriber.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
