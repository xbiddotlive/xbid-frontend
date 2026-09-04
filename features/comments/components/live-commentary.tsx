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
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";

function compactAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function authorLabel(comment: ContestComment) {
  return comment.authorName ?? compactAddress(comment.authorAddress);
}

function timeLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function positionLabel(side: ContestComment["positionSideAtPost"]): MessageKey | null {
  if (side === "A") return "comments.sideA";
  if (side === "B") return "comments.sideB";
  if (side === "BOTH") return "comments.both";
  if (side === "NONE") return "comments.former";
  return null;
}

function commentError(error: Error): MessageKey | string {
  if (error.message === "COMMENT_TRADE_REQUIRED") return "comments.tradeRequired";
  if (error.message === "COMMENT_COOLDOWN") return "comments.cooldown";
  if (error.message === "COMMENT_DAILY_LIMIT") return "comments.dailyLimit";
  if (error.message.includes("rejected") || error.message.includes("denied")) return "comments.cancelled";
  return error.message.toLowerCase();
}

function PositionBadge({ side }: { side: ContestComment["positionSideAtPost"] }) {
  const { t } = useI18n();
  const label = positionLabel(side);
  return label ? <span className="commentPosition" data-side={side.toLowerCase()}>{t(label)}</span> : null;
}

export function LiveCommentary({ contestId }: { contestId: string }) {
  const { locale, t } = useI18n();
  const dateLocale = locale === "zh" ? "zh-CN" : "en-GB";
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
    ? t("comments.connect")
    : eligibilityQuery.isPending
      ? t("comments.checking")
      : canComment
        ? t("comments.placeholder")
        : t("comments.buyToComment");
  const sendError = sendComment.isError ? commentError(sendComment.error) : null;
  const composerNote = sendComment.isError
    ? sendError && sendError.startsWith("comments.") ? t(sendError as MessageKey) : sendError
    : canComment
      ? t("comments.verifiedNote")
      : isConnected
        ? t("comments.unlockNote")
        : t("comments.connectNote");

  return (
    <aside className="liveCommentary" aria-label={t("comments.label")}>
      <header className="commentaryHeader">
        <div><MessageIcon /><strong>{t("comments.label")}</strong></div>
        <span>{t("comments.count", { count: comments?.length ?? 0 })}</span>
      </header>

      <div className="commentaryFeed">
        {commentsQuery.isError ? (
          <div className="commentaryEmpty"><MessageIcon /><strong>{t("comments.unavailable")}</strong><span>{commentsQuery.error.message.toLowerCase()}</span></div>
        ) : comments === undefined ? (
          <div className="commentaryLoading" aria-label={t("comments.loading")}><span className="skeletonBlock" /><span className="skeletonBlock" /><span className="skeletonBlock" /></div>
        ) : roots.length > 0 ? roots.map((comment) => (
          <article className="commentThread" key={comment.id}>
            <div className="userComment">
              <div className="commentAvatar">{authorLabel(comment).slice(0, 1)}</div>
              <div>
                <div className="commentMeta"><div><strong>{authorLabel(comment)}</strong><PositionBadge side={comment.positionSideAtPost} /></div><span>{timeLabel(comment.createdAt, dateLocale)}</span></div>
                <p>{comment.body}</p>
                <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">{t("comments.reply")}</button><span>{t("comments.likes", { count: comment.likes })}</span></div>
              </div>
            </div>
            {(repliesByParent.get(comment.id) ?? []).map((reply) => (
              <div className="userComment commentReply" key={reply.id}>
                <div className="commentAvatar">{authorLabel(reply).slice(0, 1)}</div>
                <div>
                  <div className="commentMeta"><div><strong>{authorLabel(reply)}</strong><PositionBadge side={reply.positionSideAtPost} /></div><span>{timeLabel(reply.createdAt, dateLocale)}</span></div>
                  <p>{reply.body}</p>
                  <div className="commentActions"><button onClick={() => setReplyingTo(comment)} type="button">{t("comments.reply")}</button><span>{t("comments.likes", { count: reply.likes })}</span></div>
                </div>
              </div>
            ))}
          </article>
        )) : (
          <div className="commentaryEmpty"><MessageIcon /><strong>{t("comments.start")}</strong><span>{t("comments.startDescription")}</span></div>
        )}
      </div>

      <form className="commentComposer" onSubmit={(event) => void submit(event)}>
        <div className="commentComposerHeading">
          <label htmlFor="comment-input">{replyingTo ? t("comments.replyTo", { author: authorLabel(replyingTo) }) : t("comments.makeCase")}</label>
          {replyingTo && <button aria-label={t("comments.cancelReply")} onClick={() => setReplyingTo(null)} type="button">{t("comments.cancel")}</button>}
        </div>
        <div className="commentComposerRow">
          <input disabled={!canComment || sendComment.isPending} id="comment-input" maxLength={240} onChange={(event) => setBody(event.target.value)} placeholder={composerPlaceholder} value={body} />
          <button disabled={!canComment || sendComment.isPending || body.trim().length === 0} type="submit">{sendComment.isPending ? t("comments.authorizing") : t("comments.send")}</button>
        </div>
        <span>{composerNote}</span>
      </form>
    </aside>
  );
}
