import { runDueAutomations } from '@/lib/automations/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async () => {
  try {
    const result = await runDueAutomations();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Automation runner tick failed.',
      },
      { status: 500 },
    );
  }
};

export const POST = GET;
