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

  if (error) {
    return <div>Error loading riddle.</div>;
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">{data.title}</h1>
      <p>{data.question}</p>
    </main>
  );
}