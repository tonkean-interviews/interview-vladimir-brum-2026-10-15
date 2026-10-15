export function NodePalette({ onAddAction }: { onAddAction: () => void }) {
    return (
        <aside className="palette">
            <h4>Actions</h4>
            <button className="palette-item" onClick={onAddAction}>
                <span className="palette-item-kind">Chatter</span>
                Post message
            </button>
            <p className="muted">Connect a node's right handle to another node's left handle to set the order.</p>
        </aside>
    );
}
