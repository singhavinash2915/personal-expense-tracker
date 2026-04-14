export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-4 animate-pulse ${className}`}>
      <div className="h-3 w-24 rounded-full mb-3" style={{ background: 'rgba(109,40,217,0.15)' }} />
      <div className="h-6 w-32 rounded-full" style={{ background: 'rgba(109,40,217,0.1)' }} />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 animate-pulse" style={{ borderBottom: '1px solid rgba(109,40,217,0.08)' }}>
      <div className="w-10 h-10 rounded-xl" style={{ background: 'rgba(109,40,217,0.12)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded-full" style={{ background: 'rgba(109,40,217,0.12)' }} />
        <div className="h-2.5 w-24 rounded-full" style={{ background: 'rgba(109,40,217,0.08)' }} />
      </div>
      <div className="h-4 w-20 rounded-full" style={{ background: 'rgba(109,40,217,0.1)' }} />
    </div>
  )
}

export function SkeletonChart({ height = 200 }) {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 w-32 rounded-full mb-4" style={{ background: 'rgba(109,40,217,0.15)' }} />
      <div className="rounded-xl" style={{ height, background: 'rgba(109,40,217,0.06)' }} />
    </div>
  )
}
