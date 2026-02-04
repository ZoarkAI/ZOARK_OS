'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Copy, Download } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
}

interface AgentExecutorProps {
  agent: Agent;
}

export default function AgentExecutor({ agent }: AgentExecutorProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);

  const handleExecute = async () => {
    if (!input.trim()) {
      alert('Please enter input for the agent');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:8000/custom-agents/${agent.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ input })
      });

      if (response.ok) {
        const data = await response.json();
        setOutput(data.output);
        setTokensUsed(data.tokensUsed || 0);
        setExecutionTime(Date.now() - startTime);
      } else {
        setOutput('Error executing agent');
      }
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  const downloadOutput = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(output));
    element.setAttribute('download', `${agent.name}-output.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <Card>
        <CardHeader>
          <CardTitle>{agent.name}</CardTitle>
          <CardDescription>{agent.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Provide input for the agent to process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            placeholder="Enter your input here..."
            value={input}
            onChange={(e: any) => setInput(e.target.value)}
            rows={6}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <Button onClick={handleExecute} disabled={loading} className="gap-2 w-full">
            <Play size={20} />
            {loading ? 'Executing...' : 'Execute Agent'}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      {output && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Output</CardTitle>
                <CardDescription>
                  Execution time: {executionTime}ms | Tokens used: {tokensUsed}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyOutput}>
                  <Copy size={16} />
                </Button>
                <Button size="sm" variant="outline" onClick={downloadOutput}>
                  <Download size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{output}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
