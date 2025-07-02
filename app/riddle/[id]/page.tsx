import supabase from '@/lib/supabase';

type Props = {
  params: {
    id: string;
  };
};

export default async function RiddlePage({ params }: Props) {
  const { id } = params;

  const { data, error } = await supabase
    .from('riddles')
    .select('*')
    .eq('id', id)
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
