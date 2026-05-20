/**
 * AgentFlowBuilder — Node-based visual builder (React Flow).
 * Agent'lari surukle-birak ile baglama; No-Code Agent Builder temeli.
 */

import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Chat Trigger' }, type: 'input' },
  { id: '2', position: { x: 300, y: 100 }, data: { label: 'Tools Agent' } },
  { id: '3', position: { x: 600, y: 200 }, data: { label: 'Success Output' }, type: 'output' },
];

const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

export function AgentFlowBuilder() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }, [setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="glass-neon rounded-3xl h-[70vh] overflow-hidden relative neon-cyan">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-gradient-to-br from-slate-950 to-black"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(0, 247, 255, 0.13)" />
        <Controls className="!bg-black/60 !border-neon-cyan/30 !rounded-lg" />
        <MiniMap nodeColor={() => '#a855f7'} className="!bg-black/60 !border-neon-cyan/30" />
      </ReactFlow>
      <div className="absolute top-4 left-4 neon-text text-lg font-bold pointer-events-none">
        Agent Orchestrator Builder
      </div>
    </div>
  );
}

export default AgentFlowBuilder;
