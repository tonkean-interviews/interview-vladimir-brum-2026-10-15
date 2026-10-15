import type { ColumnType, Generated } from 'kysely';

type CreatedAt = ColumnType<Date, never, never>;
type UpdatedAt = ColumnType<Date, never, Date>;
// mysql2 parses JSON columns on read; on write we pass a JSON string.
type Json<T> = ColumnType<T, string, string>;

export interface UsersTable {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    created_at: CreatedAt;
}

export interface DataSourcesTable {
    id: string;
    type: string;
    name: string;
    config: Json<Record<string, unknown>>;
    created_at: CreatedAt;
    updated_at: UpdatedAt;
}

export interface IncomingWebhooksTable {
    id: string;
    data_source_id: string;
    token: string;
    signing_secret: string;
    external_id: string | null;
    status: string;
    last_error: string | null;
    created_at: CreatedAt;
    updated_at: UpdatedAt;
}

export interface IncomingWebhookPayloadsTable {
    id: Generated<number>;
    incoming_webhook_id: string;
    message_type: string;
    raw_body: string;
    received_at: CreatedAt;
}

export interface ExternalActivitiesTable {
    id: string;
    data_source_id: string;
    type: string;
    entity_key: string;
    payload: Json<Record<string, unknown>>;
    created_at: CreatedAt;
}

export interface ModulesTable {
    id: string;
    name: string;
    is_published: number;
    created_by: string;
    created_at: CreatedAt;
    updated_at: UpdatedAt;
}

export interface ModuleNodesTable {
    module_id: string;
    id: string;
    kind: string;
    type: string;
    label: string;
    data_source_id: string | null;
    config: Json<Record<string, unknown>>;
    position_x: number;
    position_y: number;
}

export interface ModuleEdgesTable {
    module_id: string;
    id: string;
    source_node_id: string;
    target_node_id: string;
}

export interface ModuleRunsTable {
    id: string;
    module_id: string;
    external_activity_id: string | null;
    is_test: number;
    status: string;
    trigger_payload: Json<Record<string, unknown>>;
    started_at: CreatedAt;
    finished_at: Date | null;
}

export interface ModuleRunStepsTable {
    id: Generated<number>;
    run_id: string;
    node_id: string;
    status: string;
    output: ColumnType<Record<string, unknown> | null, string | null, string | null>;
    error: string | null;
}

export interface Database {
    users: UsersTable;
    data_sources: DataSourcesTable;
    incoming_webhooks: IncomingWebhooksTable;
    incoming_webhook_payloads: IncomingWebhookPayloadsTable;
    external_activities: ExternalActivitiesTable;
    modules: ModulesTable;
    module_nodes: ModuleNodesTable;
    module_edges: ModuleEdgesTable;
    module_runs: ModuleRunsTable;
    module_run_steps: ModuleRunStepsTable;
}
