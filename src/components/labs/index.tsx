"use client";
import DebounceLab from "./DebounceLab";
import LayersLab from "./LayersLab";
import TokenRefreshLab from "./TokenRefreshLab";
import OfflineLab from "./OfflineLab";
import ErrorPipelineLab from "./ErrorPipelineLab";
import BlocConcurrencyLab from "./BlocConcurrencyLab";
import EventLoopLab from "./EventLoopLab";
import StreamMarblesLab from "./StreamMarblesLab";
import SubscriptionLeakLab from "./SubscriptionLeakLab";

/**
 * Registry of interactive labs usable in MDX as <Lab name="..." />.
 * To add a lab: create a client component in this folder and register it here.
 */
const LABS: Record<string, React.ComponentType> = {
  debounce: DebounceLab,
  layers: LayersLab,
  "token-refresh": TokenRefreshLab,
  "offline-sync": OfflineLab,
  "error-pipeline": ErrorPipelineLab,
  "bloc-concurrency": BlocConcurrencyLab,
  "event-loop": EventLoopLab,
  "stream-marbles": StreamMarblesLab,
  "subscription-leak": SubscriptionLeakLab,
};

export default function Lab({ name }: { name: string }) {
  const Component = LABS[name];
  if (!Component) return <div className="note warn"><b>معمل مش موجود</b>مفيش معمل اسمه «{name}». سجّله في src/components/labs/index.tsx.</div>;
  return (
    <div className="lab-wrap">
      <p className="kicker">جرّب بإيدك</p>
      <Component />
    </div>
  );
}
