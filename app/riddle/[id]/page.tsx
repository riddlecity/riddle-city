import { createClient } from '@/lib/supabase';

type PageProps = {
  params: {
    id: string;
  };
};

export default async function RiddlePage({ params }: PageProps) {
  const supabase = createClient();
  const { data: riddle } = await supabase
    .from('riddles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!riddle) {
    return <div>Riddle not found</div>;
  }

  return (
    <div>
      <h1>{riddle.question}</h1>
      <p>{riddle.answer}</p>
    </div>
  );
}
