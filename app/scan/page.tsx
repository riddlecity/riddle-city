// Scan handler - Coming Soon
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ riddleId: string }>;
}

export default async function ScanRiddle({ params }: Props) {
  const { riddleId } = await params;
  
  // TODO: Implement QR code scanning functionality
  // For now, redirect to the riddle page
  redirect(`/riddle/${riddleId}`);
}