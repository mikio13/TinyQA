export function LoggedOutInfo() {
  return (
    <div className="mt-12 w-full max-w-2xl px-6 pb-12">
      <h1 className="mb-4 text-center text-2xl font-bold text-white">Tiny QA</h1>
      <p className="mb-8 text-center text-sm text-white/60">
        Your AI-powered QA assistant that lives in a pixel-art office
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-white">Monitor Repos</h3>
          <p className="text-xs text-white/50">
            Track changes across your repositories and get notified when something
            needs attention.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-white">Staging Checks</h3>
          <p className="text-xs text-white/50">
            Keep an eye on staging deployments and catch issues before they hit
            production.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-white">Code Reviews</h3>
          <p className="text-xs text-white/50">
            Automated code review powered by AI to help you ship better code faster.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-white">Real-time Alerts</h3>
          <p className="text-xs text-white/50">
            Get notifications when repos update, staging deploys, or reviews need
            your attention.
          </p>
        </div>
      </div>
    </div>
  );
}
