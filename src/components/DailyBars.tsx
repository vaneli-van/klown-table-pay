/** Daily volume bar chart in the v2 admin/owner style (needs admin.css). */
export default function DailyBars({ days, money }: { days: { day: string; pesewas: number }[]; money: (pesewas: number) => string }) {
  if (days.length === 0 || days.every((d) => !d.pesewas)) return <div className="empty-state"><h3>No payments yet</h3><p>Daily volume shows here once diners pay through Klown.</p></div>;
  const peak = Math.max(1, ...days.map((d) => d.pesewas));
  // round the top of the scale up to a tidy number so the gridlines read well
  const top = (() => {
    const v = peak / 100;
    const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
    const step = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((x) => x >= v / p) ?? 10;
    return step * p * 100;
  })();
  const label = (d: string) => {
    const t = new Date(d.length <= 10 ? d + "T12:00:00Z" : d);
    return isNaN(t.getTime()) ? d : String(t.getUTCDate());
  };
  const full = (d: string) => {
    const t = new Date(d.length <= 10 ? d + "T12:00:00Z" : d);
    return isNaN(t.getTime()) ? d : t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div className="a-chart" role="img" aria-label={`Daily volume over ${days.length} days, peak ${money(peak)}`}>
      <div className="a-chart-y" aria-hidden="true">
        {[4, 3, 2, 1, 0].map((i) => <span key={i}>{i === 0 ? "0" : money((top / 4) * i).replace(/^GH₵\s?/, "")}</span>)}
      </div>
      <div className="a-chart-body">
        <div className="a-bars" style={cols}>
          {days.map((d, i) => (
            <div key={d.day} className={"a-bar" + (i === days.length - 1 ? " today" : "")} title={`${full(d.day)}: ${money(d.pesewas)}`}>
              <div style={{ height: `${(d.pesewas / top) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="a-bar-x" aria-hidden="true" style={cols}>
          {days.map((d) => <span key={d.day}>{label(d.day)}</span>)}
        </div>
      </div>
    </div>
  );
}
