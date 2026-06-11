import { createStore } from 'botframework-webchat-core';

export type CopilotDirectLineContext = {
  campus360UserId: string;
  campus360Email: string;
  campus360Token: string;
};

/** Marks activities that are delivered to Copilot but hidden from the Web Chat UI. */
export const CAMPUS360_HIDDEN_CHANNEL = 'campus360Hidden';

type WebChatActivity = {
  type?: string;
  name?: string;
  text?: string;
  channelData?: Record<string, unknown>;
};

type WebChatAction = {
  type: string;
  payload?: {
    activity?: WebChatActivity;
  };
  meta?: {
    method?: string;
  };
};

export function isHiddenCampus360Activity(
  activity: { channelData?: Record<string, unknown> } | undefined,
) {
  return activity?.channelData?.[CAMPUS360_HIDDEN_CHANNEL] === true;
}

function postHiddenMessage(
  dispatch: (action: WebChatAction) => void,
  text: string,
) {
  dispatch({
    type: 'DIRECT_LINE/POST_ACTIVITY',
    meta: { method: 'keyboard' },
    payload: {
      activity: {
        type: 'message',
        text,
        channelData: { [CAMPUS360_HIDDEN_CHANNEL]: true },
      },
    },
  });
}

export function postUserMessage(
  dispatch: (action: WebChatAction) => void,
  text: string,
) {
  dispatch({
    type: 'DIRECT_LINE/POST_ACTIVITY',
    meta: { method: 'keyboard' },
    payload: {
      activity: {
        type: 'message',
        text,
      },
    },
  });
}

export function createCopilotDirectLineStore(context: CopilotDirectLineContext) {
  let identitySent = false;

  return createStore({}, ({ dispatch }) => next => action => {
    const typedAction = action as WebChatAction;
    const activity = typedAction.payload?.activity;

    // Copilot Studio over Direct Line only runs Conversation Start after this event.
    if (typedAction.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
      dispatch({
        type: 'DIRECT_LINE/POST_ACTIVITY',
        meta: { method: 'keyboard' },
        payload: {
          activity: {
            type: 'event',
            name: 'startConversation',
            channelData: { postBack: true },
          },
        },
      });
    }

    // After the bot's first message (Conversation Start + Question node), auto-answer
    // with the signed-in student's email so Copilot saves it to a Global variable.
    // The bubble is hidden from the UI by activityMiddleware in CopilotWebChatDirectLine.
    if (
      !identitySent &&
      typedAction.type === 'DIRECT_LINE/INCOMING_ACTIVITY' &&
      activity?.type === 'message' &&
      !isHiddenCampus360Activity(activity)
    ) {
      identitySent = true;
      window.setTimeout(() => {
        postHiddenMessage(dispatch, context.campus360Email);
      }, 600);
    }

    return next(action);
  });
}
