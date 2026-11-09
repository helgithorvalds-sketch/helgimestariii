import { createFileRoute, redirect } from "@tanstack/react-router";

/* The old film page: /fyrirtaeki#myndband opens the company film. */
export const Route = createFileRoute("/myndband")({
  beforeLoad: () => {
    throw redirect({ to: "/fyrirtaeki", hash: "myndband", statusCode: 301 });
  },
});
