# Fiber的简单实现

## 先聊一聊 React 15

React 15 的[Stack reconciler](https://zh-hans.reactjs.org/docs/implementation-notes.html)架构可以分为两层：

- Reconciler([协调器](https://zh-hans.reactjs.org/docs/reconciliation.html)): 负责找出变化的组件
- Renderer([渲染器](https://zh-hans.reactjs.org/docs/codebase-overview.html#renderers)): 负责将变化的组件渲染到页面上

在 React 中可以通过`this.setState`、`this.forceUpdate`等API触发更新，当有变化发生时，Reconciler会做以下这些事：

- 调用函数组件、或class组件的render方法，将返回的JSX转化为虚拟DOM
- 将虚拟DOM和上次更新时的虚拟DOM对比，找出本次更新中变化的虚拟DOM
- 通知Renderer将变化的虚拟DOM渲染到页面上

更简单的理解：先生成虚拟DOM节点，再把虚拟DOM节点同步到真实DOM节点，diff、协调要做的就是把虚拟DOM节点和真实DOM节点保持同步

React15架构不能支撑异步更新以至于需要重构

## Fiber是个啥

Stack Reconciler 是 React v15 及之前版本使用的协调算法。而 React Fiber 则是从 v16 版本开始对 Stack Reconciler 进行的重写，是 v16 版本的核心算法实现。

Stack Reconciler 的实现使用了同步递归模型，该模型依赖于内置堆栈来遍历。

React 团队 Andrew 之前有提到：

>如果只依赖内置调用堆栈，那么它将一直工作，直到堆栈为空，如果我们可以随意中断调用堆栈并手动操作堆栈帧，这不是很好吗? 这就是 React Fiber 的目标。Fiber 是内置堆栈的重新实现，专门用于 React 组件，可以将一个 fiber 看作是一个虚拟堆栈帧。

在React15及以前，Reconciler采用递归的方式创建虚拟DOM，递归过程是不能中断的。如果组件树的层级很深，递归会占用线程很多时间，造成卡顿。

为了解决这个问题，React16将递归的无法中断的更新重构为异步的可中断更新，由于曾经用于递归的虚拟DOM数据结构已经无法满足需要。于是，全新的Fiber架构应运而生。

Fiber是虚拟DOM的一种实现形式。

## 

先生成虚拟DOM节点，再把虚拟DOM节点同步到真实DOM节点，diff、协调要做的就是把虚拟DOM节点和真实DOM节点保持同步。

[官网的一些定义](https://zh-hans.reactjs.org/docs/reconciliation.html)

## requestIdleCallback

首次渲染之后，React 会生成一个对应于 UI 渲染的 fiber 树，称之为 current 树。

## 参考

[React中文网](https://zh-hans.reactjs.org/docs/getting-started.html)

[深入了解 React 中的新协调算法](https://indepth.dev/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react)

[React技术揭秘](https://react.iamkasong.com/preparation/oldConstructure.html#react15%E6%9E%B6%E6%9E%84)

[React Fiber 源码解析](https://zhuanlan.zhihu.com/p/179934120#:~:text=Stack%20Reconciler%20%E5%92%8C%20Fiber%20Reconciler%20%E6%88%91%E4%BB%AC%E7%9F%A5%E9%81%93%EF%BC%8CStack%20Reconciler%20%E6%98%AF,%E5%88%99%E6%98%AF%E4%BB%8E%20v16%20%E7%89%88%E6%9C%AC%E5%BC%80%E5%A7%8B%E5%AF%B9%20Stack%20Reconciler%20%E8%BF%9B%E8%A1%8C%E7%9A%84%E9%87%8D%E5%86%99%EF%BC%8C%E6%98%AF%20v16%20%E7%89%88%E6%9C%AC%E7%9A%84%E6%A0%B8%E5%BF%83%E7%AE%97%E6%B3%95%E5%AE%9E%E7%8E%B0%E3%80%82)

[React源码分析](https://www.bilibili.com/video/BV1pK41137np?from=search&seid=2951465817262473287)