const STEPS = ["Record", "Materials", "Customer", "Send"];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;

          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                    isActive
                      ? "bg-accent text-white shadow-lg shadow-accent/30"
                      : isComplete
                        ? "bg-accent/20 text-accent"
                        : "bg-white/10 text-slate-500"
                  }`}
                >
                  {isComplete ? "✓" : stepNumber}
                </div>
                <span
                  className={`mt-2 hidden text-xs font-medium sm:block ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    stepNumber < currentStep ? "bg-accent/50" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
