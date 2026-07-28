import PlayRoom from "@/components/play/PlayRoom";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <PlayRoom roomCode={roomCode.toUpperCase()} />;
}
