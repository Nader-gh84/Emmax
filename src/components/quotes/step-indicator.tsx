const STEPS = ["Record", "Materials", "Customer", "Send"];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-6 sm:mb-10">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;

          return (
            <div key={label} className="flex min-w-0 flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition sm:h-9 sm:w-9 sm:text-sm ${
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
                  className={`mt-1.5 hidden truncate text-xs font-medium sm:block ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 sm:mx-2 ${
                    stepNumber < currentStep ? "bg-accent/50" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm text-slate-400 sm:hidden">
        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]}
      </p>
    </div>
  );
}
