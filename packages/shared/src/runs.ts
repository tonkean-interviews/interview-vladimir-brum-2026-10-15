import { z } from 'zod';

export type RunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type StepStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface RunStep {
    nodeId: string;
    status: StepStatus;
    output: Record<string, unknown> | null;
    error: string | null;
}

export interface ModuleRun {
    id: string;
    moduleId: string;
    externalActivityId: string | null;
    isTest: boolean;
    status: RunStatus;
    triggerPayload: Record<string, unknown>;
    startedAt: string;
    finishedAt: string | null;
    steps: RunStep[];
}

export const testRunInputSchema = z.union([
    z.object({ ticketId: z.string().min(1) }),
    z.object({ title: z.string().min(1) }),
]);
export type TestRunInput = z.infer<typeof testRunInputSchema>;
