export default function Loading() {
  return (
    <div className="shell py-12" role="status" aria-live="polite" aria-label="กำลังโหลดเนื้อหา">
      <div className="h-8 w-48 animate-pulse rounded-full bg-muted-foreground/20" />
      <div className="mt-3 h-4 w-72 animate-pulse rounded-full bg-muted-foreground/15" />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
      <span className="sr-only">กำลังโหลด…</span>
    </div>
  )
}
