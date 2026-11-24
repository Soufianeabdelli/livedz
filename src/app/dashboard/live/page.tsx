import { Suspense } from "react";
import { getLiveSessions } from "./actions";

async function LiveList() {
  const sessions = await getLiveSessions();

  if (sessions.length === 0) {
    return <p>No live sessions yet.</p>;
  }

  return (
    <table className="mt-6 text-sm">
      <thead>
        <tr>
          <th className="pr-6 text-left">Account</th>
          <th className="pr-6 text-left">Status</th>
          <th className="pr-6 text-left">Comments</th>
          <th className="pr-6 text-left">Orders</th>
          <th className="pr-6 text-left">Questions</th>
          <th className="pr-6 text-left">Errors</th>
          <th className="pr-6 text-left">Started</th>
          <th className="text-left">Claim link</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.id}>
            <td className="pr-6">@{s.tiktokUsername}</td>
            <td className="pr-6">{s.status}</td>
            <td className="pr-6">{s.commentsSeen}</td>
            <td className="pr-6">{s.ordersCreated}</td>
            <td className="pr-6">{s.questionsSeen}</td>
            <td className="pr-6">
              {s.errors}
              {s.lastError ? ` (${s.lastError})` : ""}
            </td>
            <td className="pr-6">
              {s.startedAt ? s.startedAt.toLocaleString("en-GB") : "Not started"}
            </td>
            <td>/l/{s.sessionToken}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LivePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Live sessions</h1>
      <Suspense fallback={<p>Loading sessions...</p>}>
        <LiveList />
      </Suspense>
    </main>
  );
}