const fmt = new Intl.NumberFormat("fr-DZ");

export function Success({ refCode, totalDzd }: { refCode: string; totalDzd: number }) {
  return (
    <div className="space-y-1 rounded border border-green-600 p-4">
      <p className="text-lg font-bold">Commande recue !</p>
      <p>Reference : <b>{refCode}</b></p>
      <p>Total : {fmt.format(totalDzd)} DA (hors frais de livraison)</p>
      <p className="text-sm text-gray-500">Le vendeur va vous contacter pour confirmer.</p>
    </div>
  );
}