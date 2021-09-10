# Fiber的简单实现

## 先聊一聊 React 15

### 工作原理

React 15 的[Stack reconciler](https://zh-hans.reactjs.org/docs/implementation-notes.html)架构可以分为两层：

- Reconciler([协调器](https://zh-hans.reactjs.org/docs/reconciliation.html)): 负责找出变化的组件
- Renderer([渲染器](https://zh-hans.reactjs.org/docs/codebase-overview.html#renderers)): 负责将变化的组件渲染到页面上

在 React 中可以通过`this.setState`、`this.forceUpdate`等API触发更新，当有变化发生时，Reconciler会做以下这些事：

- 调用函数组件、或class组件的render方法，将返回的JSX转化为虚拟DOM
- 将虚拟DOM和上次更新时的虚拟DOM对比，找出本次更新中变化的虚拟DOM
- 通知Renderer将变化的虚拟DOM渲染到页面上

可以简单地理解成：先生成虚拟DOM节点，再把虚拟DOM节点同步到真实DOM节点，diff、协调要做的就是把虚拟DOM节点和真实DOM节点保持同步。

### 存在什么问题

Stack Reconciler 的实现使用了同步递归模型，该模型依赖于内置堆栈来遍历。

React 团队 Andrew 之前有提到：

>如果只依赖内置调用堆栈，那么它将一直工作，直到堆栈为空，如果我们可以随意中断调用堆栈并手动操作堆栈帧，这不是很好吗? 这就是 React Fiber 的目标。Fiber 是内置堆栈的重新实现，专门用于 React 组件，可以将一个 fiber 看作是一个虚拟堆栈帧。

在React15及以前，Reconciler采用递归的方式创建虚拟DOM，递归过程是不能中断的。如果组件树的层级很深，递归会占用线程很多时间，递归更新时间超过了16ms，用户交互就会卡顿。

React15架构不能支撑异步更新以至于需要重构。

## 再看看 React 16

### 工作原理

如果要做到异步可中断，那么还需要要知道浏览器当前是否有空闲时间。

**[requestIdleCallback](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)**

上面这个方法，浏览器已经实现，那么浏览器方法存在兼容性问题，故而React实现了polyfill，这就是Scheduler，除了在空闲时触发回调的功能外，Scheduler还提供了多种调度优先级供任务设置。

React16架构可以分为三层：

Scheduler（调度器）: 调度任务的优先级，高优任务优先进入Reconciler
Reconciler（协调器）: 负责找出变化的组件
Renderer（渲染器）: 负责将变化的组件渲染到页面上

## Fiber是个啥

React Fiber 则是从 v16 版本开始对 Stack Reconciler 进行的重写，是 v16 版本的核心算法实现。

scheduler进行时间片的调度，给每个task（工作单元）一定的时间，如果在这个时间内没执行完，也要交出执行权给浏览器进行绘制和重排，所以异步可中断的更新需要一定的数据结构在内存中来保存工作单元的信息，这个数据结构就是Fiber。

可以简单地理解成：Fiber是虚拟DOM的一种实现形式。

那么有了Fiber这种数据结构后，能完成哪些事情呢？

- 工作单元 任务分解 ：Fiber最重要的功能就是作为工作单元，保存原生节点或者组件节点对应信息（包括优先级），这些节点通过指针形成Fiber树
- 增量渲染：通过jsx对象和current Fiber的对比，生成最小的差异补丁，应用到真实节点上
- 根据优先级暂停、继续、排列优先级：Fiber节点上保存了优先级，能通过不同节点优先级的对比，达到任务的暂停、继续、排列优先级等能力，也为上层实现批量更新、Suspense提供了基础
- 保存状态：因为Fiber能保存状态和更新的信息，所以就能实现函数组件的状态更新，也就是hooks

这篇文章只关注第一点。

### 结构

```javascript
function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // 作为静态数据结构的属性，保存了组件相关的信息 Function/Class/Host...
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  // Fiber对应的真实DOM节点
  this.stateNode = null;

  // 用于连接其他Fiber节点形成Fiber树
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  // 作为动态的工作单元的属性
  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  this.mode = mode;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  // 调度优先级相关
  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  // 指向该fiber在另一次更新时对应的fiber
  this.alternate = null;
}
```

这里只关注以下这几个属性:

```javascript
// Fiber对应的真实DOM节点
this.stateNode = null
// 指向父级Fiber节点
this.return = null;
// 指向子Fiber节点
this.child = null;
// 指向右边第一个兄弟Fiber节点
this.sibling = null;
```

看个 🌰（代码在同级目录下的code文件夹），这里[通过link的方式调试React源码](#link-react)，在控制台打印了Fiber的结构

在root节点挂载这样一段JSX：

```javascript
const content = (
  <section>
    <h1 className="title">Hi, Fiber</h1>
    <div>Fiber有哪些数据结构</div>
    <>
      <div>child是子Fiber</div>
      <div>sibling是下一个兄弟Fiber</div>
      <div>return是父Fiber</div>
      <div>return是父Fiber</div>
      <div>stateNode是真实DOM，仅在原生DOM标签中存在</div>
    </>
  </section>
)

ReactDOM.render(
  content,
  document.getElementById('root')
);
```

启动项目后可以在控制台中看见这段JSX的Fiber结构：

![](https://i.loli.net/2021/09/10/SBxnKJThajL7Eoc.png)

可以看到这个对象中存在有child、return、sibling等相关的属性,他们的关系如下图所示：

![](https://i.loli.net/2021/09/10/IHSiBcKWDLeTlUO.png)

## 实践

这里我们在src目录下新建文件夹`sReactDOM`，在该文件夹下新建`react-dom.js`，添加如下代码：

```javascript
const render = (vnode, container) => {
    console.log('%c [ vnode ]', 'font-size:13px; background:pink; color:#bf2c9f;', vnode);

    console.log('%c [ container ]', 'font-size:13px; background:pink; color:#bf2c9f;', container);
}

export default {
    render
}
```

同时修改index.js文件中对ReactDom的引入：

```javascript
// import ReactDOM from 'react-dom';
import ReactDOM from './sReactDOM/react-dom';
```

保存后刷新页面，可以看到如下页面：

![](https://i.loli.net/2021/09/10/EvhqGKmNC47ibD1.png)

### 构造Fiber

前面提到，要做到异步可中断，还需要要知道浏览器当前是否有空闲时间，这里直接使用浏览器的`requestIdleCallback`方法作为演示。

在代码中调用即可：

```javascript
requestIdleCallback(workLoop);
```

传入参数workLoop，那么这个回调用于做什么事呢？

在浏览器有空闲时间时，不断执行任务，然后进入commit阶段

```javascript
// 下一个单元任务 fiber
let nextUnitOfWork = null;

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
```

继续看看 performUnitOfWork 方法:

```javascript
function performUnitOfWork(workInProgress) {
    // step1: 执行任务
    // step2: 返回下一个执行任务
}
```

step1要做的事就是根据当前工作的Fiber的信息构造节点，具体可以参见`render的简单实现`：

```javascript
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
```

step2比较容易实现，其实就是返回下一个Fiber：

```javascript
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
```

与`render的简单实现`不同的是，协调子节点时的操作：

```javascript
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
```

再来看看commit阶段做了什么：

```javascript
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

    // 有些节点是没有dom节点的，比如说fragment
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
```

至此初次渲染成功，全部代码见同级目录下的code文件夹。

## <a id="link-react">通过link的方式调试React源码</a>

- clone源码：`git clone https://github.com/facebook/react.git`
- 依赖安装：`npm install` or `yarn`
- build源码：`npm run build react/index,react/jsx,react-dom/index,scheduler --type=NODE`
- 为源码建立软链：

    ```shell
    cd build/node_modules/react
    npm link
    cd build/node_modules/react-dom
    npm link
    ```

- 使用create-react-app创建项目:

    ```shell
    npx create-react-app demo
    npm link react react-dom
    ```

## 参考

[React中文网](https://zh-hans.reactjs.org/docs/getting-started.html)

[深入了解 React 中的新协调算法](https://indepth.dev/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react)

[React技术揭秘](https://react.iamkasong.com/preparation/oldConstructure.html#react15%E6%9E%B6%E6%9E%84)

[React Fiber 源码解析](https://zhuanlan.zhihu.com/p/179934120#:~:text=Stack%20Reconciler%20%E5%92%8C%20Fiber%20Reconciler%20%E6%88%91%E4%BB%AC%E7%9F%A5%E9%81%93%EF%BC%8CStack%20Reconciler%20%E6%98%AF,%E5%88%99%E6%98%AF%E4%BB%8E%20v16%20%E7%89%88%E6%9C%AC%E5%BC%80%E5%A7%8B%E5%AF%B9%20Stack%20Reconciler%20%E8%BF%9B%E8%A1%8C%E7%9A%84%E9%87%8D%E5%86%99%EF%BC%8C%E6%98%AF%20v16%20%E7%89%88%E6%9C%AC%E7%9A%84%E6%A0%B8%E5%BF%83%E7%AE%97%E6%B3%95%E5%AE%9E%E7%8E%B0%E3%80%82)

[React源码分析](https://www.bilibili.com/video/BV1pK41137np?from=search&seid=2951465817262473287)