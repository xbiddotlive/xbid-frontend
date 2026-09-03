"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { MessageIcon } from "@/components/ui/icons";
import {
  createContestComment,
  getCommentEligibility,
  listContestComments,
  type ContestComment,
} from "@/lib/api/comments";
import { ensureWriteSession } from "@/lib/api/write-session";
import { robinhoodTestnet } from "@/lib/blockchain/chain";

function compactAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function authorLabel(comment: ContestComment) {
  return comment.authorName ?? compactAddress(comment.authorAddress);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function positionLabel(side: ContestComment["positionSideAtPost"]) {
  if (side === "A") return "side a";
  if (side === "B") return "side b";
  if (side === "BOTH") return "both sides";
  if (side === "NONE") return "former trader";
  return null;
}

function commentError(error: Error) {
  if (error.message === "COMMENT_TRADE_REQUIRED") return "complete at least a 1 test usdc buy in this contest first.";
  if (error.message === "COMMENT_COOLDOWN") return "please wait 30 seconds before posting again.";
  if (error.message === "COMMENT_DAILY_LIMIT") return "daily limit reached · try again tomorrow.";
  if (error.message.includes("rejected") || error.message.includes("denied")) return "wallet authorization was cancelled.";
  return error.message.toLowerCase();
}

function PositionBadge({ side }: { side: ContestComment["positionSideAtPost"] }) {
  const label = positionLabel(side);
  return label ? <span className="commentPosition" data-side={side.toLowerCase()}>{label}</span> : null;
}

export function LiveCommentary({ contestId }: { contestId: string }) {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<ContestComment | null>(null);
  const commentsKey = ["contest-comments", robinhoodTestnet.id, contestId] as const;
  const eligibilityKey = ["comment-eligibility", robinhoodTestnet.id, contestId, address] as const;
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: ({ signal }) => listContestComments(robinhoodTestnet.id, contestId, signal),
    refetchInterval: 5_000,
  });
  const eligibilityQuery = useQuery({
    queryKey: eligibilityKey,
    queryFn: ({ signal }) => getCommentEligibility(robinhoodTestnet.id, contestId, address!, signal),
    enabled: Boolean(address),
    refetchInterval: 10_000,
  });
  const comments = commentsQuery.data?.comments;
  const canComment = Boolean(isConnected && eligibilityQuery.data?.eligible);
  const sendComment = useMutation({
    mutationFn: async (input: { body: string; parentId?: string }) => {
      if (!address) throw new Error("connect wallet to comment");
      const sessionToken = await ensureWriteSession(address, (message) => signMessageAsync({ message }));
      return createContestComment({
        chainId: robinhoodTestnet.id,
        contestId,
        sessionToken,
        ...input,
      });
    },
    onSuccess: async () => {
      setBody("");
      setReplyingTo(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsKey }),
        queryClient.invalidateQueries({ queryKey: eligibilityKey }),
      ]);
    },
  });

  const roots = useMemo(() => comments?.filter((comment) => comment.parentId === null).slice().reverse() ?? [], [comments]);
  const repliesByParent = useMemo(() => {
    const replies = new Map<string, ContestComment[]>();
    for (const comment of comments ?? []) {
      if (!comment.parentId) continue;
      const existing = replies.get(comment.parentId) ?? [];
      existing.push(comment);
      replies.set(comment.parentId, existing);
    }
    return replies;
  }, [comments]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = body.trim();
    if (!address || !canComment || !content || sendComment.isPending) return;
    sendComment.mutate({ body: content, parentId: replyingTo?.id });
  }

  const composerPlaceholder = !isConnected
    ? "connect wallet to comment"
    : eligibilityQuery.isPending
      ? "checking trading access…"
      : canComment
        ? "share your view…"
        : "buy at least 1 test usdc to comment";
  const composerNote = sendComment.isError
    ? commentError(sendComment.error)
    : canComment
      ? "verified trader · 30 second cooldown · 20 posts per contest/day"
      : isConnected
        ? "a confirmed 1 test usdc buy in this contest unlocks comments and replies"
        : "connect a wallet to check comment access";

  return (
    <aside className="liveCommentary" aria-label="live commentary">
      <header className="commentaryHeader">
        <div><MessageIcon /><strong>live commentary</strong></div>
        <span>{comments?.length ?? 0} comments</span>
      </header>

      <div className="commentaryFeed">
        {commentsQuery.isError ? (
          <div className="commentaryEmpty"><MessageIcon /><strong>commentary unavailable</strong><span>{commentsQuery.error.message.toLowerCase()}</span></div>
        ) : comments === undefined ? (
          <div className="commentaryLoading" aria-label="loading commentary"><span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" /></div>
        ) : roots.length > 0 ? roots.map((comment) => (
          <article className="commentThread" key={comment.id}>
            <div className="userComment">
              <div className="commentAvatar">{authorLabel(comment).slice(0, 1)}</div>
              <div>
                <div className="commentMeta"><div><strong>{authorLabel(comment)}</strong><PositionBadge side={comment.positionSideAtPost} /></div><span>{timeLabel(comment.createdAt)}</span></div>
                <p>{comment.body}</p>
                <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">reply</button><span>{comment.likes} likes</span></div>
              </div>
            </div>
            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div className="userComment commentReply" key={reply.id}>
                <div className="commentAvatar">{authorLabel(reply).slice(0, 1)}</div>
                <div>
                  <div className="commentMeta"><div><strong>{authorLabel(reply)}</strong><PositionBadge side={reply.positionSideAtPost} /></div><span>{timeLabel(reply.createdAt)}</span></div>
                  <p>{reply.body}</p>
                  <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">reply</button><span>{reply.likes} likes</span></div>
                </div>
              </div>
            ))}
          </article>
        )) : (
          <div className="commentaryEmpty"><MessageIcon /><strong>start the conversation</strong><span>trade to unlock commentary, then make your case.</span></div>
        )}
      </div>

      <form className="commentComposer" onSubmit={(event) => void submit(event)}>
        <div className="commentComposerHeading">
          <label htmlFor="comment-input">{replyingTo ? `reply to ${authorLabel(replyingTo)}` : "make your case"}</label>
          {replyingTo && <button aria-label="cancel reply" onClick={() => setReplyingTo(null)} type="button">cancel</button>}
        </div>
        <div className="commentComposerRow">
          <input disabled={!canComment || sendComment.isPending} id="comment-input" maxLength={240} onChange={(event) => setBody(event.target.value)} placeholder={composerPlaceholder} value={body} />
          <button disabled={!canComment || sendComment.isPending || body.trim().length === 0} type="submit">{sendComment.isPending ? "authorizing…" : "send"}</button>
        </div>
        <span>{composerNote}</span>
      </form>
    </aside>
  );
}
