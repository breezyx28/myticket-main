import type { SupportChatMessage } from '@/api/types/support';

/**
 * UI bubble shape used by `SupportPage.tsx`. Roles collapse the API's
 * `user | agent | bot | system | string` taxonomy into the two visual lanes
 * the existing CSS knows how to align (`user` right, anything else left).
 */
export interface ChatBubble {
  id: string;
  role: 'user' | 'agent';
  text: string;
  createdAt: string;
}

/**
 * Project an API `SupportChatMessage` onto the UI bubble shape. Anything
 * that isn't authored by the customer renders on the agent side (bot and
 * system replies share that lane today).
 */
export function supportChatMessageToBubble(m: SupportChatMessage): ChatBubble {
  return {
    id: String(m.id),
    role: m.sender === 'user' ? 'user' : 'agent',
    text: m.body ?? '',
    createdAt: m.created_at,
  };
}
