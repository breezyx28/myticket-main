import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export type ContactTargetKind = 'talent' | 'vendor';

interface Props {
  open: boolean;
  targetKind: ContactTargetKind;
  targetName: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: { topic: string; initial_message?: string }) => Promise<void> | void;
}

const TARGET_LABEL: Record<ContactTargetKind, string> = {
  talent: 'talent',
  vendor: 'vendor',
};

export function ContactEngagementDialog({
  open,
  targetKind,
  targetName,
  submitting = false,
  errorMessage = null,
  onClose,
  onSubmit,
}: Props) {
  const reduceMotion = useReducedMotion();
  const dialogTitleId = useId();
  const [topic, setTopic] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setTopic('');
      setInitialMessage('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (typeof document === 'undefined') return null;

  const trimmedTopic = topic.trim();
  const trimmedMessage = initialMessage.trim();
  const canSubmit = trimmedTopic.length >= 2 && trimmedTopic.length <= 200 && !submitting;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-overlay"
          role="presentation"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
            onClick={() => {
              if (!submitting) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-ink-10 bg-white p-6 shadow-xl"
            initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28 }
            }
          >
            <h2 id={dialogTitleId} className="text-[17px] font-extrabold text-ink">
              Contact {TARGET_LABEL[targetKind]}
            </h2>
            <p className="mt-1 text-[12px] text-ink-60 line-clamp-2">{targetName}</p>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmit) return;
                void onSubmit({
                  topic: trimmedTopic,
                  initial_message: trimmedMessage || undefined,
                });
              }}
            >
              <div>
                <label className="text-[12px] font-semibold text-ink" htmlFor="contact-topic">
                  Topic <span className="text-coral">*</span>
                </label>
                <input
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={200}
                  placeholder="Booking inquiry — corporate event in Riyadh"
                  className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-4 py-2.5 text-[13px]"
                  required
                />
                <p className="mt-1 text-[11px] text-ink-40">2–200 characters.</p>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ink" htmlFor="contact-message">
                  Initial message
                </label>
                <textarea
                  id="contact-message"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  maxLength={4000}
                  rows={4}
                  placeholder="Share dates, scope, expected budget…"
                  className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-4 py-2.5 text-[13px]"
                />
                <p className="mt-1 text-[11px] text-ink-40">Optional. Up to 4000 characters.</p>
              </div>

              {errorMessage && (
                <p className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
                  {errorMessage}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    if (!submitting) onClose();
                  }}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  disabled={!canSubmit}
                  className="flex-1"
                >
                  {submitting ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
