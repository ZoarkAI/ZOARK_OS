'use client';

import { useState } from 'react';
import { Search, Filter, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  source?: string;
  url: string;
  relevance: number;
}

interface RAGSearchEnhancedProps {
  onSearch: (query: string, filters: any) => Promise<SearchResult[]>;
}

export function RAGSearchEnhanced({ onSearch }: RAGSearchEnhancedProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchResults = await onSearch(query, filters);
      setResults(searchResults);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-400" />
          Document Search
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Semantic search powered by embeddings + vector DB
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white/5 border-white/10 flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="gap-1"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Filters"
          >
            <Filter className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Document Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="">All Types</option>
                <option value="email_attachment">Email Attachment</option>
                <option value="uploaded_file">Uploaded File</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-2">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="bg-white/5 border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="bg-white/5 border-white/10 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
            >
              Apply Filters
            </Button>
          </div>
        )}

        {/* Results */}
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map((result) => (
              <a
                key={result.id}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{result.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <FileText className="w-3 h-3" />
                      <span>{result.type}</span>
                      {result.source && (
                        <>
                          <span>•</span>
                          <span>{result.source}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 text-right">
                    <div className="text-xs text-purple-400 font-medium">
                      {(result.relevance * 100).toFixed(0)}%
                    </div>
                    <div className="w-12 h-1 bg-white/10 rounded-full mt-1">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${result.relevance * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </a>
            ))
          ) : query && !loading ? (
            <div className="text-center py-6 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents found</p>
              <p className="text-xs mt-1">Try different search terms</p>
            </div>
          ) : !query ? (
            <div className="text-center py-6 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enter a search query</p>
              <p className="text-xs mt-1">Search across all indexed documents</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
