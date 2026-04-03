import { SurveyForm } from './survey-form';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SurveyPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <SurveyForm token={token} />;
}
