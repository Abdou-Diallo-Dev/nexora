export default function SuccessPage({
  searchParams,
}: {
  searchParams: { ref: string };
}) {
  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-bold text-green-600">✅ Paiement réussi !</h1>
      <p className="mt-2 text-gray-600">Référence : {searchParams.ref}</p>
    </div>
  );
}