import { redirect } from 'next/navigation';

interface AutomationDetailPageProps {
  params: Promise<{
    automationId: string;
  }>;
}

const AutomationDetailPage = async ({ params }: AutomationDetailPageProps) => {
  const { automationId } = await params;

  redirect(`/tasks?automation=${encodeURIComponent(automationId)}`);
};

export default AutomationDetailPage;
