import MafiaRoom from "@/components/mafia/MafiaRoom";

export default async function MafiaRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <MafiaRoom roomCode={roomCode.toUpperCase()} />;
}
