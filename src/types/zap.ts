export interface ZapData {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

export interface ZapNodeData {
  id?: string;
  label?: string;
  description?: string;
  actionId?: string;
  metadata?: Record<string, unknown>;
}
