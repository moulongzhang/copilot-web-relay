import type { ConnectionStatus as Status } from '../utils/protocol';

interface Props {
  status: Status;
}

export default function ConnectionStatus({ status }: Props) {
  const labels: Record<Status, string> = {
    connected: '● Connected',
    disconnected: '○ Disconnected',
    reconnecting: '◌ Reconnecting…',
  };

  return (
    <div className={`connection-status status-${status}`}>
      {labels[status]}
    </div>
  );
}
