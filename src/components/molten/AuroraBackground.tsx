export function AuroraBackground() {
  return (
    <div className="aurora-layer" aria-hidden>
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 600px at 50% 0%, transparent, hsl(20 20% 4% / 0.7) 80%)",
        }}
      />
    </div>
  );
}