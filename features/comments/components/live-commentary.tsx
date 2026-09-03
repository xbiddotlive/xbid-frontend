"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { MessageIcon } from "@/components/ui/icons";
import { createCommentChallenge, createContestComment, listContestComments, type ContestComment } from "@/lib/api/comments";
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

export function LiveCommentary({ contestId }: { contestId: string }) {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<ContestComment | null>(null);
  const commentsKey = ["contest-comments", robinhoodTestnet.id, contestId] as const;
  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: ({ signal }) => listContestComments(robinhoodTestnet.id, contestId, signal),
    refetchInterval: 5_000,
  });
  const comments = commentsQuery.data?.comments;
  const sendComment = useMutation({
    mutationFn: async (input: { body: string; parentId?: string }) => {
      if (!address) throw new Error("connect wallet to comment");
      const challenge = await createCommentChallenge({
        chainId: robinhoodTestnet.id, contestId, walletAddress: address, ...input,
      });
      const signature = await signMessageAsync({ message: challenge.message });
      return createContestComment({
        chainId: robinhoodTestnet.id,
        contestId,
        walletAddress: address,
        challengeId: challenge.challengeId,
        signature,
        ...input,
      });
    },
    onSuccess: async () => {
      setBody("");
      setReplyingTo(null);
      await queryClient.invalidateQueries({ queryKey: commentsKey });
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
    if (!address || !content || sendComment.isPending) return;
    sendComment.mutate({ body: content, parentId: replyingTo?.id });
  }

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
                <div className="commentMeta"><strong>{authorLabel(comment)}</strong><span>{timeLabel(comment.createdAt)}</span></div>
                <p>{comment.body}</p>
                <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">reply</button><span>{comment.likes} likes</span></div>
              </div>
            </div>
            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div className="userComment commentReply" key={reply.id}>
                <div className="commentAvatar">{authorLabel(reply).slice(0, 1)}</div>
                <div>
                  <div className="commentMeta"><strong>{authorLabel(reply)}</strong><span>{timeLabel(reply.createdAt)}</span></div>
                  <p>{reply.body}</p>
                  <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">reply</button><span>{reply.likes} likes</span></div>
                </div>
              </div>
            ))}
          </article>
        )) : (
          <div className="commentaryEmpty"><MessageIcon /><strong>start the conversation</strong><span>share the view behind your position.</span></div>
        )}
      </div>

      <form className="commentComposer" onSubmit={(event) => void submit(event)}>
        <div className="commentComposerHeading">
          <label htmlFor="comment-input">{replyingTo ? `reply to ${authorLabel(replyingTo)}` : "make your case"}</label>
          {replyingTo && <button aria-label="cancel reply" onClick={() => setReplyingTo(null)} type="button">cancel</button>}
        </div>
        <div className="commentComposerRow">
          <input disabled={!isConnected || sendComment.isPending} id="comment-input" maxLength={240} onChange={(event) => setBody(event.target.value)} placeholder={isConnected ? "share your view…" : "connect wallet to comment"} value={body} />
          <button disabled={!isConnected || sendComment.isPending || body.trim().length === 0} type="submit">{sendComment.isPending ? "signing…" : "send"}</button>
        </div>
        <span>{sendComment.isError ? sendComment.error.message.toLowerCase() : (isConnected ? "wallet signature verifies authorship · 240 characters" : "connect a wallet to join the discussion")}</span>
      </form>
    </aside>
  );
}
