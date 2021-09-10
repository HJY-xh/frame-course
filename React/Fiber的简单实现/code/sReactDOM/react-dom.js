// 以下代码仅针对初次渲染

let wipRoot = null;

// 下一个单元任务 fiber
let nextUnitOfWork = null;

const render = (vnode, container) => {
    console.log('%c [ vnode ]', 'font-size:13px; background:pink; color:#bf2c9f;', vnode);
    console.log('%c [ container ]', 'font-size:13px; background:pink; color:#bf2c9f;', container);

    wipRoot = {
        type: 'div',
        props: {
            children: { ...vnode }
        },
        stateNode: container,
    }

    nextUnitOfWork = wipRoot;
}

const createNode = (workInProgress) => {
    const { type } = workInProgress;

    const node = document.createElement(type);

    updateNode(node, workInProgress.props);

    return node;
}

const updateNode = (node, props) => {
    Object.keys(props).forEach(item => {
        if (item === "children") {
            if (isStringOrNumber(props[item])) {
                node.textContent = props[item]
            }
        } else {
            node[item] = props[item];
        }
    });
}

const reconcileChildren = (workInProgress, children) => {

    if (isStringOrNumber(children)) {
        return;
    }

    const newChildren = Array.isArray(children) ? children : [children];

    // 记录上一个fiber
    let previousNewFiber = null;

    for (let i = 0; i < newChildren.length; i++) {
        let child = newChildren[i];
        // 遍历时改成fiber结构
        let newFiber = {
            key: child?.key,
            type: child?.type,
            props: { ...child?.props },
            stateNode: null,
            child: null,
            sibling: null,
            return: workInProgress
        }

        if (i === 0) {
            // 第一个子fiber
            workInProgress.child = newFiber;
        } else {
            previousNewFiber.sibling = newFiber;
        }

        previousNewFiber = newFiber;
    }
}

const isStringOrNumber = (something) => {
    return typeof something === 'string' || typeof something === 'number';
}

function workLoop(IdleDeadline) {
    // 返回一个时间DOMHighResTimeStamp, 并且是浮点类型的数值，它用来表示当前闲置周期的预估剩余毫秒数。
    while (nextUnitOfWork && IdleDeadline.timeRemaining() > 1) {
        // 执行任务，并且返回下一个执行任务
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }

    // commit 阶段可以理解为就是将 Diff 的结果反映到真实 DOM 的过程
    if (!nextUnitOfWork && wipRoot) {
        commitRoot();
    }

}

function performUnitOfWork(workInProgress) {
    // step1: 执行任务
    const { type } = workInProgress;
    if (typeof type === "string") {
        // 原生标签节点
        updateHostComponent(workInProgress);
    } else if (typeof type === "function") {
        type.prototype?.isReactComponent
            ? updateClassComponent(workInProgress)
            : updateFunctionComponent(workInProgress);
    } else {
        updateFragmentComponent(workInProgress);
    }

    // step2: 返回下一个执行任务
    // 如果有子节点，传给子节点
    if (workInProgress.child) {
        return workInProgress.child;
    }

    let nextFiber = workInProgress;
    while (nextFiber) {
        // 如果有兄弟节点，传给兄弟节点
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }
        // 指向父节点
        nextFiber = nextFiber.return;
    }

}

function commitRoot() {
    commitWorker(wipRoot.child);
    // 这里是为了不重复执行
    wipRoot = null;
}

function commitWorker(workInProgress) {
    if (!workInProgress) {
        return;
    }

    let parentNodeFiber = workInProgress.return;

    // 有些节点是没有dom节点的
    while (!parentNodeFiber.stateNode) {
        parentNodeFiber = parentNodeFiber.return;
    }

    // 提交自己
    let parentNode = parentNodeFiber.stateNode;

    if (workInProgress.stateNode) {
        parentNode.appendChild(workInProgress.stateNode);
    }

    // 提交子节点
    commitWorker(workInProgress.child);

    // 提交兄弟节点
    commitWorker(workInProgress.sibling);

}

function updateHostComponent(workInProgress) {

    const { props } = workInProgress;

    if (!workInProgress.stateNode) {
        workInProgress.stateNode = createNode(workInProgress);
    }

    // 协调
    reconcileChildren(workInProgress, props.children);

    console.log('[ workInProgress ]', workInProgress);
}

function updateFunctionComponent(workInProgress) {
    const { type, props } = workInProgress;
    const child = type(props);
    reconcileChildren(workInProgress, child);
}

function updateClassComponent(workInProgress) {
    const { type, props } = workInProgress;
    // 类组件需要 new 
    const instance = new type(props);

    const child = instance.render();

    reconcileChildren(workInProgress, child);
}

function updateFragmentComponent(workInProgress) {
    reconcileChildren(workInProgress, workInProgress.props.children);
}

requestIdleCallback(workLoop);

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    render
}

