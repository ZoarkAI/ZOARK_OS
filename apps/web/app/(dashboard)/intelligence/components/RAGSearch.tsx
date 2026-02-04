'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, FileText, Loader2 } from 'lucide-react';

interface SearchResult {
  score: number;
  text: string;
  metadata: Record<string, any>;
}

export function RAGSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('');

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/intelligence/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          top_k: 5,
          filter_type: filterType || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="glass-card px-3 rounded border-glass-border text-sm"
        >
          <option value="">All Types</option>
          <option value="invoice">Invoices</option>
          <option value="contract">Contracts</option>
          <option value="email">Emails</option>
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {results.map((result, index) => (
          <Card key={`result-${index}-${result.score.toFixed(3)}`} className="glass-card-hover">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm mb-2">{result.text.slice(0, 200)}...</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-medium text-blue-400">
                      Score: {(result.score * 100).toFixed(0)}%
                    </span>
                    {result.metadata.type && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                        {result.metadata.type}
                      </span>
                    )}
                    {result.metadata.date && (
                      <span>{result.metadata.date}</span>
                    )}
                    {result.metadata.amount && (
                      <span className="font-medium text-green-400">
                        ${result.metadata.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {results.length === 0 && !loading && query && (
          <div className="text-center py-12 text-gray-400">
            No results found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
