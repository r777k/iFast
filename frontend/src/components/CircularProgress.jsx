export default function CircularProgress({ progress, elapsed, phase }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  // Calculate the stroke offset based on the progress percentage
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center my-6">
      <svg className="w-56 h-56 transform -rotate-90">
        {/* Background track */}
        <circle
          className="text-gray-100"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="112"
          cy="112"
        />
        {/* Animated progress ring */}
        <circle
          className="text-primary transition-all duration-700 ease-out"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="112"
          cy="112"
        />
      </svg>
      {/* Centered text metrics */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-sm font-medium text-text-secondary mb-1 uppercase tracking-wider">{phase}</span>
        <span className="text-4xl font-semibold text-text-primary font-mono">{elapsed}</span>
      </div>
    </div>
  );
}