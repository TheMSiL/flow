import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LogoMark } from './Logo'

export function RootErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const title = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'Something broke'
  const detail =
    error instanceof Error
      ? error.message
      : 'An unexpected error interrupted this screen. Your workflows are safe — nothing was lost.'

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <LogoMark className="size-9" />
      <div className="flex size-12 items-center justify-center rounded-xl border border-state-danger/25 bg-state-danger/10 text-state-danger">
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        <p className="text-[13px] leading-6 text-ink-muted">{detail}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button variant="primary" onClick={() => (window.location.href = '/')}>
          Reload FLOW
        </Button>
      </div>
    </div>
  )
}
