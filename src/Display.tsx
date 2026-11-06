import type { ReactNode } from 'react';
import type { Resource } from './useDashboard';
import { Icon } from './Icons';

export const time = (value: number | string | null | undefined) =>
  value == null
    ? 'Not yet received'
    : new Date(value).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
      });
export const hour = (value: string) =>
  new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
export const date = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
export const ready = <T,>(r: Resource<T>, value: ReactNode) =>
  r.data ? value : r.error ? 'Unavailable' : 'Loading';

export function SourceNote({
  resource,
  name,
}: {
  resource: Resource<unknown>;
  name: string;
}) {
  return (
    <div className={`source-note ${resource.error ? 'source-error' : ''}`}>
      {resource.error ? (
        <>
          <Icon name="info" size={16} />
          <span>
            {name} could not refresh;{' '}
            {resource.updatedAt
              ? `last received ${time(resource.updatedAt)} UTC.`
              : 'retrying every 10 seconds.'}
          </span>
        </>
      ) : (
        <>
          <Icon name="clock" size={16} />
          <span>
            {resource.updatedAt
              ? `${name} updated ${time(resource.updatedAt)} UTC`
              : `Connecting to ${name.toLowerCase()}…`}
          </span>
        </>
      )}
    </div>
  );
}
