/**
 * @function 查看vnode、container信息
 */
// const render = (vnode, container) => {
//     console.log('%c [ vnode ]', 'font-size:13px; background:pink; color:#bf2c9f;', vnode)
//     console.log('%c [ container ]', 'font-size:13px; background:pink; color:#bf2c9f;', container)
// }

/**
 * @function 渲染思路
 */
// step1: vnode -> node
// step2: 将node插入到container

/**
 * @function 初步实现
 */
const render = (vnode, container) => {
    console.log('%c [ vnode ]', 'font-size:13px; background:pink; color:#bf2c9f;', vnode)

    const node = createNode(vnode);

    container.appendChild(node);
}

const createNode = (vnode) => {
    let node;

    // todo: 根据虚拟DOM节点，生成真实DOM节点
    const { type } = vnode;
    if (typeof type === 'string') {
        // 原生标签节点
        node = updateHostComponent(vnode);
    } else if (isStringOrNumber(vnode)) {
        // 文本标签节点
        node = updateTextComponent(vnode);
    } else if (typeof type === 'function') {
        // 类/函数式 组件
        node = type.prototype.isReactComponent ? updateClassComponent(vnode) : updateFunctionComponent(vnode);
    } else {
        // Fragment
        node = updateFragmentComponent(vnode);
    }
    return node;
}

// 生成原生标签节点
const updateHostComponent = (vnode) => {
    const { type, props } = vnode;
    const node = document.createElement(type);
    updateNode(node, props);
    reconcileChildren(node, props.children)
    return node;
}

const updateNode = (node, props) => {
    Object.keys(props).filter(ele => ele !== "children").forEach(item => {
        node[item] = props[item];
    })
}

const reconcileChildren = (parentNode, children) => {
    const newChildren = Array.isArray(children) ? children : [children];
    for (let child of newChildren) {
        // vnode -> node, 把node插入parentNode
        render(child, parentNode);
    }
}

// 生成文本标签节点
const updateTextComponent = (vnode) => {
    return document.createTextNode(vnode);
}

const isStringOrNumber = (something) => {
    return typeof something === 'string' || typeof something === 'number';
}

const updateFunctionComponent = (vnode) => {
    const { type, props } = vnode;
    const child = type(props);
    // vnode -> node
    const node = createNode(child);
    return node;
}

const updateClassComponent = (vnode) => {
    const { type, props } = vnode;
    // 实例化
    const instance = new type(props);
    const child = instance.render();
    // vnode -> node
    const node = createNode(child);
    return node;
}

const updateFragmentComponent = (vnode) => {
    // 源码中是直接处理子节点
    const node = document.createDocumentFragment();
    reconcileChildren(node, vnode.props.children);
    return node;
}


// eslint-disable-next-line import/no-anonymous-default-export
export default {
    render
}

