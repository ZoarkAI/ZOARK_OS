import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold gradient-text">
          ZOARK OS
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl">
          Agentic Workflow Engine - Autonomous task monitoring, email drafting, and approval management
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/pulse"
            className="glass-card-hover px-8 py-3 rounded-lg font-semibold"
          >
            Enter Dashboard
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card-hover px-8 py-3 rounded-lg font-semibold"
          >
            API Docs
          </a>
        </div>
      </div>
    </div>
  );
}
