export class OrchestratorItem<TKey, TValue> {
    public readonly step: TKey;
    private readonly children = new Map<TKey, OrchestratorItem<TKey, TValue>>()
    public readonly value?: TValue;
    public readonly parent?: OrchestratorItem<TKey, TValue>;

    constructor(
        step: TKey, 
        parent?: OrchestratorItem<TKey, TValue>,
        value?: TValue
    ) {
        this.step = step; 
        this.parent = parent;
        this.value = value;
    }

    public isFinal() {
        return typeof this.value !== undefined;
    }

    public shallowGet(step: TKey): OrchestratorItem<TKey, TValue> | undefined {
        return this.children.get(step);
    }

    public shallowHas(step: TKey): boolean {
        return this.children.has(step);
    }

    public shallowIterate(): Iterator<OrchestratorItem<TKey, TValue>> {
        return this.children.values();
    }

    public *deepIterate(): Iterator<[TKey[], OrchestratorItem<TKey, TValue>]> {
        const currentNodes: {path: TKey[], node: OrchestratorItem<TKey, TValue>}[] = [{path: [], node: this}];

        while (currentNodes.length > 0) {
            const {path, node} = currentNodes.shift();
            currentNodes.push(
                ...[...node.children.values()].map(node => ({node, path: [...path, node.step]}))
            );

            yield [path, node];
        }
    }

    public deepGet(steps: TKey[]): OrchestratorItem<TKey, TValue> | undefined {
        let currentNode: OrchestratorItem<TKey, TValue> = this;
        for (const step of steps) {
            currentNode = currentNode.shallowGet(step);
            if (!currentNode) return;
        }

        return currentNode;
    }

    public shallowAdd(step: TKey, value?: TValue) {
        this.children.set(step, new OrchestratorItem(step, this, value));
    }

    public deepAdd(steps: TKey[], value?: TValue) {
        let currentNode: OrchestratorItem<TKey, TValue> = this;
        for (const [index, step] of steps.entries()) {
            if (index + 1 === steps.length) {
                // @ts-ignore
                return currentNode.shallowAdd(step, new OrchestratorItem(step, currentNode, value));
            }
            currentNode = currentNode.shallowGet(step);
        }


    }

}