import { createFileRoute } from "@tanstack/react-router";
import { DrumMachine } from "@/components/machine/DrumMachine";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <DrumMachine />;
}
