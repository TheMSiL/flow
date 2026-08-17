import { Link, useLocation } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { Button, EmptyState } from '@/components/ui'

export default function NotFoundPage() {
  const location = useLocation()

  return (
    <>
      <Topbar crumbs={[{ label: 'Not found' }]} />
      <PageBody>
        <EmptyState
          icon={<Compass className="size-5" aria-hidden />}
          title="This page does not exist"
          description={`Nothing is routed at “${location.pathname}”. It may have moved, or the link is out of date.`}
          action={
            <div className="flex gap-2">
              <Button variant="secondary">
                <Link to="/workflows">Workflows</Link>
              </Button>
              <Button variant="primary">
                <Link to="/">Back to overview</Link>
              </Button>
            </div>
          }
        />
      </PageBody>
    </>
  )
}
