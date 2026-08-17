import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { resolveIcon } from '@/lib/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { integrationService } from '@/services/integration.service'
import { cn } from '@/lib/utils'
import type { Integration } from '@/types/integration'

type Phase = 'consent' | 'connecting' | 'done'

const STEPS = [
  'Opening the provider’s consent screen',
  'Exchanging the authorization code',
  'Verifying granted scopes',
]

/** Mock OAuth handshake — deliberately paced so the states are legible. */
export function ConnectDialog({
  integration,
  onClose,
}: {
  integration: Integration | null
  onClose: () => void
}) {
  const { toast } = useToast()
  const [phase, setPhase] = useState<Phase>('consent')
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (integration) {
      setPhase('consent')
      setStep(0)
    }
  }, [integration])

  useEffect(() => {
    if (phase !== 'connecting') return
    const timers = [
      setTimeout(() => setStep(1), 450),
      setTimeout(() => setStep(2), 950),
    ]
    return () => timers.forEach(clearTimeout)
  }, [phase])

  if (!integration) return null

  const Icon = resolveIcon(integration.icon)

  const connect = async () => {
    setPhase('connecting')
    await integrationService.connect(integration.slug)
    setPhase('done')
    toast({
      tone: 'success',
      title: `${integration.name} connected successfully`,
      description: 'Nodes using this integration are ready to run.',
    })
    setTimeout(onClose, 900)
  }

  return (
    <Modal
      open={Boolean(integration)}
      onClose={onClose}
      size="sm"
      dismissible={phase !== 'connecting'}
      title={
        phase === 'done' ? `${integration.name} connected` : `Connect ${integration.name}`
      }
      description={
        phase === 'done'
          ? 'You can now use it in any workflow in this workspace.'
          : `FLOW will be able to act on your behalf using the scopes below.`
      }
      icon={
        <span style={{ color: integration.brand }}>
          <Icon className="size-4" aria-hidden />
        </span>
      }
      footer={
        phase === 'consent' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={connect}>
              Authorize
            </Button>
          </>
        ) : phase === 'done' ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : undefined
      }
    >
      {phase === 'consent' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <ShieldCheck className="size-3.5" aria-hidden />
              Requested scopes
            </div>
            <ul className="mt-2 space-y-1.5">
              {integration.scopes.map((scope) => (
                <li key={scope} className="flex items-center gap-2 text-[12px] text-ink-muted">
                  <Check className="size-3 shrink-0 text-state-success" aria-hidden />
                  <code className="font-mono text-[11px]">{scope}</code>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] leading-5 text-ink-faint">
            This is a demonstration handshake. No credentials are requested, stored or
            transmitted — everything stays in this browser.
          </p>
        </div>
      )}

      {phase === 'connecting' && (
        <ul className="space-y-2.5">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2.5">
              {index < step ? (
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-state-success/15">
                  <Check className="size-2.5 text-state-success" aria-hidden />
                </span>
              ) : index === step ? (
                <LoaderCircle
                  className="size-4 shrink-0 animate-spin text-state-running"
                  aria-hidden
                />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-line" />
              )}
              <span
                className={cn(
                  'text-[12px]',
                  index <= step ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {phase === 'done' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="flex flex-col items-center gap-3 py-4"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-state-success/12">
            <Check className="size-6 text-state-success" aria-hidden />
          </span>
          <p className="text-[13px] text-ink-muted">
            Connected as{' '}
            <span className="text-ink">{integration.account ?? 'your account'}</span>
          </p>
        </motion.div>
      )}
    </Modal>
  )
}
