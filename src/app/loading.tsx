import { LoadingLogo } from '@/components/LoadingLogo';

/**
 * Root loading boundary. Every page in the app is `force-dynamic`, so each
 * navigation waits on a server render — this is what fills that gap. Nested
 * routes inherit this boundary, so one file covers the whole app.
 */
export default function Loading() {
  return <LoadingLogo />;
}
