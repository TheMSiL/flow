import { useMemo, useState } from 'react'
import { Check, CornerDownRight, MessageCircle, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Textarea } from '@/components/ui/Input'
import { useDb } from '@/hooks/useDb'
import { workflowService } from '@/services/workflow.service'
import { getUser } from '@/data/users'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'

const selectComments = (s: DbState) => s.comments

export function NodeCommentsSection({
  workflowId,
  nodeId,
}: {
  workflowId: string
  nodeId?: string
}) {
  const all = useDb(selectComments)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  const comments = useMemo(
    () =>
      all
        .filter((c) => c.workflowId === workflowId && (!nodeId || c.nodeId === nodeId))
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [all, workflowId, nodeId],
  )

  const submit = async () => {
    if (!draft.trim()) return
    await workflowService.addComment({ workflowId, nodeId, body: draft.trim() })
    setDraft('')
  }

  const submitReply = async (commentId: string) => {
    if (!replyDraft.trim()) return
    await workflowService.replyToComment(commentId, replyDraft.trim())
    setReplyDraft('')
    setReplyTo(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 p-4">
        {comments.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageCircle className="size-4" aria-hidden />}
            title="No comments yet"
            description="Leave a note for whoever picks this workflow up next."
          />
        ) : (
          comments.map((comment) => {
            const author = getUser(comment.authorId)
            return (
              <article
                key={comment.id}
                className={cn(
                  'rounded-lg border border-line bg-surface-sunken p-3',
                  comment.resolved && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-2">
                  <Avatar user={author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12px] font-medium text-ink">
                        {author.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-faint">
                        {formatRelative(comment.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => workflowService.toggleCommentResolved(comment.id)}
                        aria-label={comment.resolved ? 'Reopen comment' : 'Resolve comment'}
                        className={cn(
                          'ml-auto flex size-5 shrink-0 items-center justify-center rounded transition-colors',
                          comment.resolved
                            ? 'text-state-success'
                            : 'text-ink-faint hover:text-state-success',
                        )}
                      >
                        <Check className="size-3.5" aria-hidden />
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-ink-muted">
                      {comment.body}
                    </p>

                    {comment.replies.map((reply) => {
                      const replyAuthor = getUser(reply.authorId)
                      return (
                        <div
                          key={reply.id}
                          className="mt-2.5 flex items-start gap-2 border-l border-line pl-2.5"
                        >
                          <Avatar user={replyAuthor} size="xs" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-ink">
                                {replyAuthor.name}
                              </span>
                              <span className="text-[10px] text-ink-faint">
                                {formatRelative(reply.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[12px] leading-5 text-ink-muted">
                              {reply.body}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    {replyTo === comment.id ? (
                      <div className="mt-2 flex items-end gap-1.5">
                        <Textarea
                          rows={2}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          placeholder="Reply…"
                          className="text-[12px]"
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => submitReply(comment.id)}
                        >
                          <Send className="size-3" aria-hidden />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReplyTo(comment.id)}
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-faint transition-colors hover:text-ink"
                      >
                        <CornerDownRight className="size-3" aria-hidden />
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      <div className="border-t border-line p-3">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="text-[12px]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-ink-faint">⌘↵ to post</span>
          <Button size="sm" variant="primary" disabled={!draft.trim()} onClick={submit}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  )
}
