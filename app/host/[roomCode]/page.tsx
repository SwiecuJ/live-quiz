import HostRoom from "@/components/host/HostRoom";

export default async function HostPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <HostRoom roomCode={roomCode.toUpperCase()} />;
}
