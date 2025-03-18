# Flow Editor Components

This directory contains components for the Zap Flow Editor, which allows users to create and edit automation workflows (Zaps).

## Components

- **FlowEditor.tsx**: The main container component that sets up React Flow with basic features like background, controls, and minimap. It handles node and edge state management.

- **ActionNode.tsx**: A custom node component that displays actions in the flow. It includes handles for connections and uses our existing `ActionIcon` component.

- **ActionSidebar.tsx**: A sidebar component that displays available actions that can be dragged onto the canvas.

## Implementation Approach

The Flow Editor follows these steps:

1. **Drag and Drop**: Users can drag actions from the sidebar onto the canvas to create nodes.
2. **Node Configuration**: (TODO) Users will be able to configure nodes by clicking on them and editing their properties.
3. **Edge Connections**: Users can connect nodes by dragging from one handle to another.
4. **Save/Load**: (TODO) The flow can be saved to and loaded from the backend API.

## Integration with Backend

Future work will include:

- Fetching available actions from the API
- Saving Zap configurations to the API
- Loading existing Zaps for editing
- Running/activating Zaps through the API

## Component Structure

The Editor is structured as:

```
ZapEditor (Page Component)
├── Header (Zap name, Save button)
├── ActionSidebar (Draggable actions)
└── FlowEditor (Canvas)
    ├── ActionNodes (Custom nodes)
    ├── Edges (Connections between nodes)
    ├── Controls (Zoom, fit view)
    └── MiniMap (Overview)
```
