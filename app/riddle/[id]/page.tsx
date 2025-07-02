// app/riddle/[id]/page.tsx
import { supabase } from '@/lib/supabase';

type Riddle = {
  id: string;
  title: string;
  riddle_text: string;
  qr_hint: string;
};

export default async function RiddlePage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data, error } = await supabase
    .from('riddles')
    .select('id, title, riddle_text, qr_hint')
    .eq('id', id)
    .single();

  if (error) {
    return <div>Error loading riddle: {error.message}</div>;
  }

  const riddle = data as Riddle;

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{riddle.title}</h1>
      <p className="text-lg mb-6">{riddle.riddle_text}</p>
      <p className="text-gray-600 italic">Hint: {riddle.qr_hint}</p>
    </main>
  );
}
