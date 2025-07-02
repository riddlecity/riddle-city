import { createClient } from '@/lib/supabase/server';

export default async function RiddlePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('riddles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return <div>Error loading riddle.</div>;
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{data.title}</h1>
      <p className="text-lg">{data.question}</p>
    </main>
  );
}
