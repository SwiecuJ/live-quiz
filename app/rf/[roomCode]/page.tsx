import RfRoom from "@/components/rf/RfRoom";

export default async function RyzykFizykRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <RfRoom roomCode={roomCode.toUpperCase()} />;
}
