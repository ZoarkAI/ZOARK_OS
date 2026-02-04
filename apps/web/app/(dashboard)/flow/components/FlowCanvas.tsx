'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ApprovalNode } from './ApprovalNode';

const nodeTypes = {
  approvalNode: ApprovalNode,
};

interface ApprovalStep {
  id: string;
  invoiceId: string;
  stage: string;
  assigneeEmail: string;
  status: string;
  deadline: string;
  requiredDocs: string[];
  lastNudgedAt?: string;
}

interface FlowCanvasProps {
  invoiceId: string;
}

export function FlowCanvas({ invoiceId }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovalSteps();
  }, [invoiceId]);

  async function fetchApprovalSteps() {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/approval-steps`);
      if (res.ok) {
        const steps: ApprovalStep[] = await res.json();
        createFlowFromSteps(steps);
      }
    } catch (error) {
      console.error('Error fetching approval steps:', error);
      // Use mock data
      createFlowFromSteps(getMockApprovalSteps(invoiceId));
    } finally {
      setLoading(false);
    }
  }

  function createFlowFromSteps(steps: ApprovalStep[]) {
    // Create nodes
    const newNodes: Node[] = steps.map((step, index) => ({
      id: step.id,
      type: 'approvalNode',
      position: { x: index * 300, y: 100 },
      data: step,
    }));

    // Create edges connecting sequential steps
    const newEdges: Edge[] = steps.slice(0, -1).map((step, index) => ({
      id: `edge-${step.id}-${steps[index + 1].id}`,
      source: step.id,
      target: steps[index + 1].id,
      animated: steps[index].status === 'APPROVED',
      style: {
        stroke: steps[index].status === 'APPROVED' ? '#10b981' : 'rgba(255,255,255,0.2)',
        strokeWidth: 2,
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <p className="text-gray-400">Loading approval pipeline...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="glass-card rounded"
      >
        <Background color="rgba(255,255,255,0.1)" />
        <Controls className="glass-card" />
        <MiniMap
          className="glass-card"
          nodeColor={(node) => {
            const status = (node.data as ApprovalStep).status;
            if (status === 'APPROVED') return '#10b981';
            if (status === 'REJECTED') return '#ef4444';
            return '#eab308';
          }}
        />
      </ReactFlow>
    </div>
  );
}

function getMockApprovalSteps(invoiceId: string): ApprovalStep[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: '1',
      invoiceId,
      stage: 'LEGAL_REVIEW',
      assigneeEmail: 'legal@example.com',
      status: 'APPROVED',
      deadline: yesterday.toISOString(),
      requiredDocs: ['contract.pdf', 'sow.pdf'],
    },
    {
      id: '2',
      invoiceId,
      stage: 'FINANCE_CHECK',
      assigneeEmail: 'finance@example.com',
      status: 'PENDING',
      deadline: yesterday.toISOString(),
      requiredDocs: ['invoice.pdf'],
      lastNudgedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      invoiceId,
      stage: 'MANAGER_APPROVAL',
      assigneeEmail: 'manager@example.com',
      status: 'PENDING',
      deadline: tomorrow.toISOString(),
      requiredDocs: [],
    },
    {
      id: '4',
      invoiceId,
      stage: 'EXECUTIVE_APPROVAL',
      assigneeEmail: 'exec@example.com',
      status: 'PENDING',
      deadline: tomorrow.toISOString(),
      requiredDocs: ['budget.xlsx'],
    },
  ];
}
