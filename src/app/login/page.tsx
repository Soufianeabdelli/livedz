import { LoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">Pincasting</h1>
      <p className="text-gray-500">Espace vendeur</p>
      <LoginButton />
    </main>
  );
}