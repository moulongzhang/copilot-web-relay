import type { ToolExecution } from '../utils/protocol';

interface Props {
  tools: ToolExecution[];
}

const icons: Record<string, string> = {
  edit_file: '📝',
  create_file: '📄',
  run_command: '⚙️',
  search: '🔍',
  read_file: '📖',
};

export default function ToolIndicator({ tools }: Props) {
  if (tools.length === 0) return null;

  return (
    <div className="tool-indicators">
      {tools.map((t, i) => (
        <div key={i} className={`tool-indicator tool-${t.status}`}>
          <span className="tool-icon">{icons[t.tool] ?? '🔧'}</span>
          <span className="tool-name">{t.tool}</span>
          <span className="tool-detail">{t.detail}</span>
          {t.status === 'running' && <span className="tool-spinner">⏳</span>}
          {t.status === 'success' && <span className="tool-check">✓</span>}
          {t.status === 'failure' && <span className="tool-fail">✗</span>}
        </div>
      ))}
    </div>
  );
}
