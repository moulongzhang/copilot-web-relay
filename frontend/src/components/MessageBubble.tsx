import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { ChatMessage } from '../utils/protocol';
import ToolIndicator from './ToolIndicator';

interface Props {
  message: ChatMessage;
}

const base = import.meta.env.BASE_URL;
const userAvatar = `${base}williamz.png`;
const copilotAvatar = `${base}copilot-icon.png`;

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-row ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        <img src={isUser ? userAvatar : copilotAvatar} alt={isUser ? 'User' : 'Copilot'} />
      </div>
      <div className="message-body">
        {message.tools.length > 0 && <ToolIndicator tools={message.tools} />}
        <div className="message-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content || (message.done ? '' : '...')}
            </ReactMarkdown>
          )}
        </div>
        {!message.done && <div className="typing-indicator"><span /><span /><span /></div>}
      </div>
    </div>
  );
}
