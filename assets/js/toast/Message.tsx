import { MessageLevel } from "./level.ts";

const ROOT_TEXT_COLOR: Record<MessageLevel, string> = {
  [MessageLevel.INFO]: "text-cyan-800",
  [MessageLevel.WARNING]: "text-yellow-800",
  [MessageLevel.DANGER]: "text-red-800",
};

const ROOT_BORDER_COLOR: Record<MessageLevel, string> = {
  [MessageLevel.INFO]: "border-cyan-300",
  [MessageLevel.WARNING]: "border-yellow-300",
  [MessageLevel.DANGER]: "border-red-300",
};

const ROOT_BACKGROUND_COLOR: Record<MessageLevel, string> = {
  [MessageLevel.INFO]: "bg-cyan-100",
  [MessageLevel.WARNING]: "bg-yellow-100",
  [MessageLevel.DANGER]: "bg-red-100",
};

const STATIC_ROOT_CLASSES = "w-full border-2 p-2 rounded-lg mb-2 mx-auto";

// Function that will be called when a Toast notification expires - or when a
// Toast notification is manually dismissed.
function afterExpiresOrDismissed(child: HTMLElement) {
  if (!child.isConnected) {
    return;
  }

  const parent = child.parentElement;
  if (parent === null || !(parent instanceof HTMLDivElement)) {
    return;
  }

  parent.removeChild(child);
}

function animateProgress(
  element: HTMLProgressElement,
  duration: number,
  onFinish: () => void,
) {
  let start: DOMHighResTimeStamp | null = null;

  function step(timestamp: DOMHighResTimeStamp) {
    if (start === null) {
      start = timestamp;
    }

    const elapsed = timestamp - start;

    const progress = Math.min(elapsed / duration, 1);
    element.value = progress;

    console.log(progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onFinish();
    }
  }

  requestAnimationFrame(step);
}

export default function Message({
  level,
  message,
  timeout,
}: {
  level: MessageLevel;
  message: string | HTMLElement;
  timeout: number;
}) {
  const colorClass = ROOT_TEXT_COLOR[level];
  const borderColorClass = ROOT_BORDER_COLOR[level];
  const backgroundColorClass = ROOT_BACKGROUND_COLOR[level];

  const rootColorClasses = `${colorClass} ${borderColorClass} ${backgroundColorClass}`;
  const rootClass = `${STATIC_ROOT_CLASSES} ${rootColorClasses}`;

  const dismissButton = (
    <p class="text-zinc-600! ml-auto mr-2 cursor-pointer justify-self-end font-semibold">
      x
    </p>
  );

  const progressElement = (
    <progress class="h-1 w-full rounded-xl text-zinc-600" max="1" value="0.0" />
  );

  const root = (
    <div class={rootClass}>
      <div class="flex flex-row flex-nowrap gap-6">
        <p>{message}</p>
        {dismissButton}
      </div>
      {progressElement}
    </div>
  );

  const dismissButtonRef = dismissButton as unknown as HTMLElement;
  const elementRef = root as unknown as HTMLElement;

  const bound = () => afterExpiresOrDismissed(elementRef);
  dismissButtonRef.addEventListener("click", bound);

  animateProgress(
    progressElement as unknown as HTMLProgressElement,
    timeout,
    () => bound(),
  );
  return root;
}
