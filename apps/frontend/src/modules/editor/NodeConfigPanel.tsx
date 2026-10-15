import type { DataSourceType } from '@tiny-tonkean/shared/data-sources';
import {
    type ActionNode,
    type ChatterPostMessageConfig,
    findNodeDefinition,
    type TemplateVariable,
    type TriggerNode,
} from '@tiny-tonkean/shared/module-graph';
import type { RunStep } from '@tiny-tonkean/shared/runs';
import { useChatterChannels, useDataSources } from '../../api/data-sources';
import type { FlowNode } from './graph-mapping';

type EditableNode = FlowNode['data']['node'];

interface Props {
    flowNode: FlowNode;
    upstreamNodes: FlowNode[];
    step: RunStep | undefined;
    onChange: (node: EditableNode) => void;
}

function DataSourceSelect({
    type,
    value,
    onChange,
}: {
    type: DataSourceType;
    value: string | null;
    onChange: (id: string | null) => void;
}) {
    const { data: dataSources = [] } = useDataSources();
    return (
        <label>
            Data source
            <select value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
                <option value="">Select…</option>
                {dataSources
                    .filter((dataSource) => dataSource.type === type)
                    .map((dataSource) => (
                        <option key={dataSource.id} value={dataSource.id}>
                            {dataSource.name}
                        </option>
                    ))}
            </select>
        </label>
    );
}

function TriggerFields({ node, onChange }: { node: Omit<TriggerNode, 'position'>; onChange: Props['onChange'] }) {
    return (
        <>
            <DataSourceSelect
                type="TICKETS"
                value={node.dataSourceId}
                onChange={(dataSourceId) => onChange({ ...node, dataSourceId })}
            />
            <div className="muted">Runs for every new ticket.</div>
        </>
    );
}

function ActionFields({
    node,
    variables,
    onChange,
}: {
    node: Omit<ActionNode, 'position'>;
    variables: TemplateVariable[];
    onChange: Props['onChange'];
}) {
    const { data: channels = [] } = useChatterChannels(node.dataSourceId);
    const config = node.config as ChatterPostMessageConfig;
    return (
        <>
            <DataSourceSelect
                type="CHATTER"
                value={node.dataSourceId}
                onChange={(dataSourceId) => onChange({ ...node, dataSourceId })}
            />
            <label>
                Channel
                <input
                    list={`channels-${node.id}`}
                    value={config.channel}
                    onChange={(event) => onChange({ ...node, config: { ...config, channel: event.target.value } })}
                />
                <datalist id={`channels-${node.id}`}>
                    {channels.map((channel) => (
                        <option key={channel.name} value={channel.name} />
                    ))}
                </datalist>
            </label>
            <label>
                Message
                <textarea
                    rows={4}
                    value={config.messageTemplate}
                    onChange={(event) =>
                        onChange({ ...node, config: { ...config, messageTemplate: event.target.value } })
                    }
                />
            </label>
            <div className="variables">
                <div className="muted">Available variables</div>
                {variables.map((variable) => (
                    <code key={variable.path} title={variable.description}>
                        {`{{${variable.path}}}`}
                    </code>
                ))}
            </div>
        </>
    );
}

function templateVariables(upstreamNodes: FlowNode[]): TemplateVariable[] {
    return upstreamNodes.flatMap((flowNode) => {
        const { node } = flowNode.data;
        const outputs = findNodeDefinition(node)?.outputs ?? [];
        if (node.kind === 'TRIGGER') {
            return outputs;
        }
        return outputs.map((field) => ({
            path: `nodes.${node.id}.${field.path}`,
            description: `${node.label}: ${field.description}`,
        }));
    });
}

export function NodeConfigPanel({ flowNode, upstreamNodes, step, onChange }: Props) {
    const { node } = flowNode.data;

    return (
        <section className="panel-section">
            <h4>Node settings</h4>
            <label>
                Label
                <input value={node.label} onChange={(event) => onChange({ ...node, label: event.target.value })} />
            </label>
            {node.kind === 'TRIGGER' ? (
                <TriggerFields node={node} onChange={onChange} />
            ) : (
                <ActionFields node={node} variables={templateVariables(upstreamNodes)} onChange={onChange} />
            )}
            {step && (
                <div className="step-result">
                    <div className="muted">Last shown run: {step.status}</div>
                    {step.error && <div className="error">{step.error}</div>}
                    {step.output && <pre>{JSON.stringify(step.output, null, 2)}</pre>}
                </div>
            )}
        </section>
    );
}
