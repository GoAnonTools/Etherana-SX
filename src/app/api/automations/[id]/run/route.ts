import { runAutomationById } from '@/lib/automations/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await context.params;
    const result = await runAutomationById(id, 'manual');

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Automation run failed.',
      },
      { status: 500 },
    );
  }
};
