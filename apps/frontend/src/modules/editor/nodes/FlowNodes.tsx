import type { ChatterPostMessageConfig } from '@tiny-tonkean/shared/module-graph';
import type { StepStatus } from '@tiny-tonkean/shared/runs';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import type { ActionFlowNode, TriggerFlowNode } from '../graph-mapping';

function nodeClassName(kind: 'trigger' | 'action', selected: boolean, runStatus?: StepStatus) {
    return ['flow-node', kind, selected ? 'selected' : '', runStatus ? `run-${runStatus.toLowerCase()}` : '']
        .filter(Boolean)
        .join(' ');
}

export function TriggerNodeView({ data, selected }: NodeProps<TriggerFlowNode>) {
    const { node, runStatus } = data;
    return (
        <div className={nodeClassName('trigger', selected, runStatus)}>
            <div className="flow-node-kind">Tickets · Trigger</div>
            <div className="flow-node-label">{node.label}</div>
            <div className="flow-node-summary">Any new ticket</div>
            {runStatus && <div className="flow-node-status">{runStatus}</div>}
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

export function ActionNodeView({ data, selected }: NodeProps<ActionFlowNode>) {
    const { node, runStatus } = data;
    const { channel } = node.config as ChatterPostMessageConfig;
    return (
        <div className={nodeClassName('action', selected, runStatus)}>
            <Handle type="target" position={Position.Left} />
            <div className="flow-node-kind">Chatter · Action</div>
            <div className="flow-node-label">{node.label}</div>
            <div className="flow-node-summary">{channel ? `#${channel}` : 'No channel selected'}</div>
            {runStatus && <div className="flow-node-status">{runStatus}</div>}
            <Handle type="source" position={Position.Right} />
        </div>
    );
}

export const nodeTypes = {
    trigger: TriggerNodeView,
    action: ActionNodeView,
};
