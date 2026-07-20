export default function Loading() {
  return (
    <div className="route-loading" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>Preparing the market lens…</p>
    </div>
  );
}
