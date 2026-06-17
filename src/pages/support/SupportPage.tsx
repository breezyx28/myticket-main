import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateComplaintMutation,
  useCreateSupportCaseMutation,
  useGetComplaintCategoriesQuery,
  useGetSupportChatSessionQuery,
  usePostSupportChatMessageMutation,
  usePromoteSupportChatMutation,
  useStartSupportChatMutation,
} from '@/api/endpoints';
import { createSupportCaseSchema, supportMessageSchema, SUPPORT_CATEGORIES } from '@/schemas/support';
import { createComplaintSchema } from '@/schemas/complaint';
import { supportChatMessageToBubble } from '@/lib/supportMappers';
import type { SupportCategory } from '@/api/types/support';
import type { ComplaintCategoryDef } from '@/api/types/complaint';
import { cn } from '@/lib/utils';

const CHAT_SESSION_STORAGE_KEY = 'myticket_support_chat_session_id';

function categoryLabel(t: (key: string) => string, c: (typeof SUPPORT_CATEGORIES)[number]) {
  return t(`categories.${c}`);
}

function readApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const candidate = (err as { data?: unknown }).data;
    if (candidate && typeof candidate === 'object') {
      const message = (candidate as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
    const direct = (err as { message?: unknown }).message;
    if (typeof direct === 'string' && direct.trim().length > 0) return direct;
  }
  return fallback;
}

function readStoredSessionId(): string | null {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredSessionId(id: string | null) {
  try {
    if (id == null) sessionStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    else sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, id);
  } catch {
    /* sessionStorage unavailable — chat still works in-memory this load. */
  }
}

function parseSupportTab(value: string | null): 'chat' | 'request' {
  return value === 'request' ? 'request' : 'chat';
}

export function SupportPage() {
  const { t } = useTranslation(['support', 'common']);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'chat' | 'request'>(() =>
    parseSupportTab(searchParams.get('tab')),
  );

  useEffect(() => {
    setTab(parseSupportTab(searchParams.get('tab')));
  }, [searchParams]);

  function selectTab(next: 'chat' | 'request') {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'chat') nextParams.delete('tab');
    else nextParams.set('tab', 'request');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6 lg:px-8">
        <h1 className="text-[32px] font-extrabold text-ink">{t('support:title')}</h1>
        <p className="mt-2 text-[15px] text-ink-60">
          Live chat and tracked requests both reach our support team. Sign in to keep a single
          thread across reloads.
        </p>

        <div className="mt-8 inline-flex rounded-full border border-ink-10 bg-ink-5/50 p-1">
          <button
            type="button"
            onClick={() => selectTab('chat')}
            className={cn(
              'rounded-full px-5 py-2 text-[13px] font-bold',
              tab === 'chat' ? 'bg-ink text-white' : 'text-ink-60'
            )}
          >
            {t('chatTab', 'Live chat')}
          </button>
          <button
            type="button"
            onClick={() => selectTab('request')}
            className={cn(
              'rounded-full px-5 py-2 text-[13px] font-bold',
              tab === 'request' ? 'bg-ink text-white' : 'text-ink-60'
            )}
          >
            {t('requestTab', 'Open a request')}
          </button>
        </div>

        {tab === 'chat' ? <ChatTab /> : <RequestTab user={user} />}
      </div>
    </div>
  );
}

function ChatTab() {
  const { t } = useTranslation('support');
  const { user } = useAuth();
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(() => readStoredSessionId());
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotedCaseId, setPromotedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSessionId(null);
      writeStoredSessionId(null);
    }
  }, [user]);

  const {
    data: sessionDetail,
    isFetching: sessionFetching,
    isError: sessionError,
  } = useGetSupportChatSessionQuery(
    sessionId ? { sessionId } : { sessionId: '' },
    { skip: !user || !sessionId }
  );

  useEffect(() => {
    if (sessionError && sessionId) {
      setSessionId(null);
      writeStoredSessionId(null);
    }
  }, [sessionError, sessionId]);

  useEffect(() => {
    if (sessionDetail?.promoted_case_id != null) {
      setPromotedCaseId(String(sessionDetail.promoted_case_id));
    }
  }, [sessionDetail?.promoted_case_id]);

  const messages = useMemo(() => {
    if (!sessionDetail?.messages) return [];
    return sessionDetail.messages
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(supportChatMessageToBubble);
  }, [sessionDetail]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const [startSupportChat, { isLoading: starting }] = useStartSupportChatMutation();
  const [postSupportChatMessage, { isLoading: posting }] = usePostSupportChatMessageMutation();
  const [promoteSupportChat, { isLoading: promoting }] = usePromoteSupportChatMutation();

  const sessionStatus = sessionDetail?.status;
  const sessionPromoted =
    promotedCaseId != null || sessionStatus === 'promoted' || sessionStatus === 'closed';

  async function onSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const text = chatInput.trim();
    if (!text) return;
    setChatError(null);

    try {
      await supportMessageSchema.validate({ body: text });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : t('chat.messageInvalid'));
      return;
    }

    if (!sessionId) {
      try {
        const session = await startSupportChat({ initial_message: text }).unwrap();
        const newId = String(session.id);
        setSessionId(newId);
        writeStoredSessionId(newId);
        setChatInput('');
      } catch (err) {
        setChatError(readApiErrorMessage(err, t('chat.startFailed')));
      }
      return;
    }

    try {
      await postSupportChatMessage({ sessionId, body: { body: text } }).unwrap();
      setChatInput('');
    } catch (err) {
      setChatError(readApiErrorMessage(err, t('chat.sendFailed')));
    }
  }

  async function onPromote() {
    if (!sessionId) return;
    setPromoteError(null);
    try {
      const created = await promoteSupportChat({ sessionId }).unwrap();
      setPromotedCaseId(String(created.id));
    } catch (err) {
      setPromoteError(readApiErrorMessage(err, t('chat.escalateFailed')));
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
      <h2 className="text-lg font-extrabold text-ink">Chat thread</h2>
      {!user ? (
        <p className="mt-4 text-[14px] text-ink-60">
          <Link to="/login" className="font-semibold text-coral hover:underline">
            Sign in
          </Link>{' '}
          to chat with our support team.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-ink-60">Signed in as {user.email}</p>

          {sessionPromoted && promotedCaseId && (
            <div className="mt-4 rounded-xl border border-mint/40 bg-mint/15 px-4 py-3 text-[13px] font-semibold text-ink">
              This chat was escalated to support case #{promotedCaseId}. The team will follow up there.
            </div>
          )}

          <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-ink-10 bg-white p-4">
            {sessionFetching && messages.length === 0 ? (
              <p className="text-[13px] text-ink-40">Loading chat history…</p>
            ) : messages.length === 0 ? (
              <p className="text-[13px] text-ink-40">
                Send a message to start a new chat session.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed',
                      m.role === 'user'
                        ? 'bg-ink text-white'
                        : 'border border-ink-10 bg-ink-5/80 text-ink'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            <div ref={listEndRef} />
          </div>

          {chatError && (
            <p className="mt-3 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
              {chatError}
            </p>
          )}

          <form onSubmit={onSendChat} className="mt-4 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                sessionPromoted ? t('chat.closedPlaceholder') : t('chat.messagePlaceholder')
              }
              className="min-w-0 flex-1 rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral disabled:bg-ink-5/40 disabled:text-ink-40"
              disabled={starting || posting || sessionPromoted}
            />
            <Button
              type="submit"
              variant="dark"
              size="md"
              disabled={starting || posting || sessionPromoted || !chatInput.trim()}
            >
              {starting || posting ? t('chat.sending') : t('chat.send')}
            </Button>
          </form>

          {sessionId && !sessionPromoted && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink-10 bg-white px-4 py-3 text-[12px] text-ink-60">
              <span className="font-semibold text-ink">Need formal tracking?</span>
              <span>Convert this chat into a tracked support case so you can re-open it later.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPromote}
                disabled={promoting}
              >
                {promoting ? t('chat.escalating') : t('chat.escalate')}
              </Button>
              {promoteError && (
                <span className="text-[12px] font-semibold text-coral">{promoteError}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface RequestTabProps {
  user: ReturnType<typeof useAuth>['user'];
}

function RequestTab({ user }: RequestTabProps) {
  const [mode, setMode] = useState<'case' | 'complaint'>('case');

  if (!user) {
    return (
      <div className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
        <h2 className="text-lg font-extrabold text-ink">Open a request</h2>
        <p className="mt-2 text-[14px] text-ink-60">
          <Link to="/login" className="font-semibold text-coral hover:underline">
            Sign in
          </Link>{' '}
          to file a support case or formal complaint.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="inline-flex rounded-full border border-ink-10 bg-ink-5/50 p-1">
        <button
          type="button"
          onClick={() => setMode('case')}
          className={cn(
            'rounded-full px-4 py-1.5 text-[12px] font-bold',
            mode === 'case' ? 'bg-ink text-white' : 'text-ink-60'
          )}
        >
          Support case
        </button>
        <button
          type="button"
          onClick={() => setMode('complaint')}
          className={cn(
            'rounded-full px-4 py-1.5 text-[12px] font-bold',
            mode === 'complaint' ? 'bg-ink text-white' : 'text-ink-60'
          )}
        >
          Formal complaint
        </button>
      </div>

      {mode === 'case' ? <SupportCaseForm /> : <ComplaintForm />}
    </div>
  );
}

function SupportCaseForm() {
  const { t } = useTranslation('support');
  const [category, setCategory] = useState<SupportCategory>('ticket');
  const [subject, setSubject] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [createSupportCase, { isLoading: submitting }] = useCreateSupportCaseMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      category,
      subject: subject.trim(),
      order_reference: orderRef.trim() || undefined,
      message: message.trim(),
    };

    try {
      await createSupportCaseSchema.validate(payload, { abortEarly: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('case.formReview'));
      return;
    }

    try {
      const created = await createSupportCase(payload).unwrap();
      setCreatedId(String(created.id));
      setSubject('');
      setOrderRef('');
      setMessage('');
    } catch (err) {
      setError(readApiErrorMessage(err, t('case.submitFailed')));
    }
  }

  if (createdId) {
    return (
      <div className="mt-6 rounded-2xl border border-mint/40 bg-mint/15 p-5">
        <p className="text-[14px] font-semibold text-ink">
          Support case #{createdId} received. We&apos;ll respond by email and on this page.
        </p>
        <button
          type="button"
          onClick={() => setCreatedId(null)}
          className="mt-3 text-[13px] font-semibold text-coral hover:underline"
        >
          Open another case
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Support case</h2>
      <p className="text-[13px] text-ink-60">
        Routed to the support queue. Use this for booking, technical, or account issues.
      </p>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SupportCategory)}
          className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] outline-none focus:border-coral"
        >
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(t, c)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Subject</span>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral"
          placeholder={t('case.summaryPlaceholder')}
        />
      </label>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Order / ticket ref (optional)</span>
        <input
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 font-mono text-[13px] outline-none focus:border-coral"
          placeholder="ORD-…"
        />
      </label>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Message</span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral"
          placeholder={t('case.descriptionPlaceholder')}
        />
      </label>

      {error && (
        <p className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
          {error}
        </p>
      )}

      <Button type="submit" variant="dark" size="md" disabled={submitting}>
        {submitting ? t('case.submitting') : t('case.submit')}
      </Button>
    </form>
  );
}

function ComplaintForm() {
  const { t } = useTranslation('support');
  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useGetComplaintCategoriesQuery();
  const categories: ComplaintCategoryDef[] = categoriesResponse?.data ?? [];

  const [parentId, setParentId] = useState<string>('');
  const [subId, setSubId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [orderId, setOrderId] = useState('');
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [createComplaint, { isLoading: submitting }] = useCreateComplaintMutation();

  useEffect(() => {
    if (!parentId && categories.length > 0) {
      setParentId(categories[0]!.id);
    }
  }, [parentId, categories]);

  const selectedParent = useMemo(
    () => categories.find((c) => c.id === parentId) ?? null,
    [categories, parentId]
  );

  useEffect(() => {
    setSubId('');
  }, [parentId]);

  const subcategories = selectedParent?.subcategories ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!parentId) {
      setError(t('complaint.pickCategory'));
      return;
    }
    if (subcategories.length > 0 && !subId) {
      setError(t('complaint.pickSubcategory'));
      return;
    }

    const categoryValue = subcategories.length > 0 ? subId : parentId;
    const payload = {
      category: categoryValue,
      subject: subject.trim(),
      body: body.trim(),
      related_order_id: orderId.trim() || undefined,
      related_event_id: eventId.trim() || undefined,
      attachments: [] as string[],
    };

    try {
      await createComplaintSchema.validate(payload, { abortEarly: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('complaint.formReview'));
      return;
    }

    try {
      const created = await createComplaint(payload).unwrap();
      setCreatedId(String(created.id));
      setSubject('');
      setBody('');
      setOrderId('');
      setEventId('');
    } catch (err) {
      setError(readApiErrorMessage(err, t('complaint.submitFailed')));
    }
  }

  if (createdId) {
    return (
      <div className="mt-6 rounded-2xl border border-mint/40 bg-mint/15 p-5">
        <p className="text-[14px] font-semibold text-ink">
          Complaint #{createdId} received. Our review team will follow up by email.
        </p>
        <button
          type="button"
          onClick={() => setCreatedId(null)}
          className="mt-3 text-[13px] font-semibold text-coral hover:underline"
        >
          File another complaint
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Formal complaint</h2>
      <p className="text-[13px] text-ink-60">
        Use this for organizer, venue, safety, or staff issues that need a written record.
      </p>

      {categoriesLoading ? (
        <p className="text-[13px] text-ink-40">Loading complaint categories…</p>
      ) : categoriesError ? (
        <p className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
          Could not load complaint categories. Please retry shortly.
        </p>
      ) : (
        <>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-60">Category</span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] outline-none focus:border-coral"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {subcategories.length > 0 && (
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">Subcategory</span>
              <select
                value={subId}
                onChange={(e) => setSubId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] outline-none focus:border-coral"
              >
                <option value="">Pick a subcategory</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Subject</span>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral"
          placeholder={t('complaint.summaryPlaceholder')}
        />
      </label>

      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Description</span>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral"
          placeholder={t('complaint.descriptionPlaceholder')}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-60">Related order id (optional)</span>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 font-mono text-[13px] outline-none focus:border-coral"
            placeholder="ORD-…"
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink-60">Related event id (optional)</span>
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 font-mono text-[13px] outline-none focus:border-coral"
            placeholder="EVT-…"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
          {error}
        </p>
      )}

      <Button type="submit" variant="dark" size="md" disabled={submitting || categoriesLoading}>
        {submitting ? t('complaint.submitting') : t('complaint.submit')}
      </Button>
    </form>
  );
}
