import type { ModuleDocument } from '@tiny-tonkean/shared/module-graph';
import type { ModuleRun } from '@tiny-tonkean/shared/runs';
import {
    addEdge,
    Background,
    type Connection,
    Controls,
    type Edge,
    type EdgeChange,
    MiniMap,
    type NodeChange,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useModule, useSaveModule, useSetPublished } from '../../api/modules';
import { type FlowNode, fromFlow, newActionNode, toFlow } from './graph-mapping';
import { NodeConfigPanel } from './NodeConfigPanel';
import { NodePalette } from './NodePalette';
import { nodeTypes } from './nodes/FlowNodes';
import { RunsHistory } from './RunsHistory';
import { TestPanel } from './TestPanel';

export function ModuleEditorPage() {
    const { moduleId = '' } = useParams();
    const { data: module, isPending, error } = useModule(moduleId);

    if (isPending) {
        return <div className="page">Loading…</div>;
    }
    if (error || !module) {
        return <div className="page error">{error?.message ?? 'Module not found'}</div>;
    }
    return (
        <ReactFlowProvider>
            <ModuleEditor key={module.id} module={module} />
        </ReactFlowProvider>
    );
}

function errorLines(error: Error | null): string[] {
    if (!error) {
        return [];
    }
    return error instanceof ApiError && error.details.length > 0 ? error.details : [error.message];
}

function ModuleEditor({ module }: { module: ModuleDocument }) {
    const initial = useMemo(() => toFlow(module), [module.id]);
    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
    const [name, setName] = useState(module.name);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [shownRun, setShownRun] = useState<ModuleRun | null>(null);
    const [isDirty, setDirty] = useState(false);

    const saveModule = useSaveModule(module.id);
    const setPublished = useSetPublished(module.id);
    const isPublished = setPublished.data?.isPublished ?? saveModule.data?.isPublished ?? module.isPublished;

    const onNodesChangeTracked = useCallback(
        (changes: NodeChange<FlowNode>[]) => {
            if (changes.some((change) => change.type !== 'select' && change.type !== 'dimensions')) {
                setDirty(true);
            }
            onNodesChange(changes);
        },
        [onNodesChange],
    );

    const onEdgesChangeTracked = useCallback(
        (changes: EdgeChange[]) => {
            if (changes.some((change) => change.type !== 'select')) {
                setDirty(true);
            }
            onEdgesChange(changes);
        },
        [onEdgesChange],
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            setEdges((current) =>
                addEdge({ ...connection, id: `${connection.source}->${connection.target}` }, current),
            );
            setDirty(true);
        },
        [setEdges],
    );

    const addAction = () => {
        const rightmost = Math.max(...nodes.map((node) => node.position.x), 0);
        setNodes((current) => [...current, newActionNode({ x: rightmost + 320, y: 160 })]);
        setDirty(true);
    };

    const updateNode = (updated: FlowNode['data']['node']) => {
        setNodes((current) =>
            current.map((node) =>
                node.id === updated.id ? ({ ...node, data: { ...node.data, node: updated } } as FlowNode) : node,
            ),
        );
        setDirty(true);
    };

    const save = async () => {
        await saveModule.mutateAsync({ name, ...fromFlow(nodes, edges) });
        setDirty(false);
    };

    const togglePublished = async () => {
        if (isDirty) {
            await save();
        }
        await setPublished.mutateAsync(!isPublished);
    };

    const statusByNodeId = useMemo(() => new Map(shownRun?.steps.map((step) => [step.nodeId, step]) ?? []), [shownRun]);
    const displayNodes = useMemo(
        () =>
            nodes.map(
                (node) =>
                    ({ ...node, data: { ...node.data, runStatus: statusByNodeId.get(node.id)?.status } }) as FlowNode,
            ),
        [nodes, statusByNodeId],
    );

    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    const upstreamNodes = selectedNode ? ancestors(selectedNode.id, nodes, edges) : [];
    const trigger = nodes.find((node) => node.data.node.kind === 'TRIGGER');
    const triggerNode = trigger?.data.node.kind === 'TRIGGER' ? trigger.data.node : undefined;
    const errors = [...errorLines(saveModule.error), ...errorLines(setPublished.error)];

    return (
        <div className="editor">
            <div className="editor-toolbar">
                <input
                    className="module-name"
                    value={name}
                    onChange={(event) => {
                        setName(event.target.value);
                        setDirty(true);
                    }}
                />
                <span className={isPublished ? 'badge success' : 'badge'}>{isPublished ? 'Published' : 'Draft'}</span>
                {isDirty && <span className="muted">Unsaved changes</span>}
                <div className="spacer" />
                <button onClick={() => void save().catch(() => {})} disabled={saveModule.isPending}>
                    {saveModule.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                    className="primary"
                    onClick={() => void togglePublished().catch(() => {})}
                    disabled={setPublished.isPending}
                >
                    {isPublished ? 'Unpublish' : 'Publish'}
                </button>
            </div>
            {errors.length > 0 && (
                <ul className="editor-errors">
                    {errors.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            )}
            <div className="editor-body">
                <NodePalette onAddAction={addAction} />
                <div className="canvas">
                    <ReactFlow
                        nodes={displayNodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChangeTracked}
                        onEdgesChange={onEdgesChangeTracked}
                        onConnect={onConnect}
                        onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
                        onPaneClick={() => setSelectedNodeId(null)}
                        fitView
                    >
                        <Background />
                        <MiniMap />
                        <Controls />
                    </ReactFlow>
                </div>
                <aside className="side-panel">
                    {selectedNode ? (
                        <NodeConfigPanel
                            flowNode={selectedNode}
                            upstreamNodes={upstreamNodes}
                            step={statusByNodeId.get(selectedNode.id)}
                            onChange={updateNode}
                        />
                    ) : (
                        <section className="panel-section muted">Select a node to edit it.</section>
                    )}
                    <TestPanel
                        moduleId={module.id}
                        triggerDataSourceId={triggerNode?.dataSourceId ?? null}
                        hasUnsavedChanges={isDirty}
                        onRunFinished={setShownRun}
                    />
                    <RunsHistory moduleId={module.id} selectedRunId={shownRun?.id ?? null} onSelect={setShownRun} />
                </aside>
            </div>
        </div>
    );
}

function ancestors(nodeId: string, nodes: FlowNode[], edges: Edge[]): FlowNode[] {
    const found = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const edge of edges) {
            if (edge.target === current && !found.has(edge.source)) {
                found.add(edge.source);
                queue.push(edge.source);
            }
        }
    }
    return nodes.filter((node) => found.has(node.id));
}
