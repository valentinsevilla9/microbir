export default function StatCard({
  label,
  valor,
  sub,
  color,
  bg,
}: {
  label: string;
  valor: string | number;
  sub?: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <p className={`text-2xl font-bold ${color}`}>{valor}</p>
      <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
