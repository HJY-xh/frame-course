# React中render的实现

## React核心API

为了更顺利实现render，需要先了解一些React核心API

- `React.createElement()`

React 17以前使用JSX时，编译器会将其转换为浏览器可以理解的React函数调用，旧的 JSX 转换会把 JSX 转换为 `React.createElement(...)` 调用。

看个🌰  

```javascript
import React from 'react';

function App() {
  return <h1>Hello World</h1>;
}

// 经过转化后
import React from 'react';

function App() {
  return React.createElement('h1', null, 'Hello world');
}
```

React 17 在 React 的 package 中引入了两个新入口，这些入口只会被 Babel 和 TypeScript 等编译器使用。新的 JSX 转换不会将 JSX 转换为 `React.createElement`，而是自动从 React 的 package 中引入新的入口函数并调用，调用的最终结果也是返回一个`ReactElement`

>react/jsx-runtime 和 react/jsx-dev-runtime 中的函数只能由编译器转换使用。如果你需要在代码中手动创建元素，可以继续使用 `React.createElement`

- `ReactDOM.render()`

先看看render函数的简化后的源码

```javascript
export function render(
  element: React$Element<any>,
  container: Container,
  callback: ?Function,
) {
  invariant(
    isValidContainerLegacy(container),
    'Target container is not a DOM element.',
  );
  return legacyRenderSubtreeIntoContainer(
    null,
    element,
    container,
    false,
    callback,
  );
}
```

它接收3个参数

- element：其实就是需要渲染的节点
- container：容器，在该容器下渲染
- callback：回调

**思考：渲染时分为初次渲染和更新，它们的区别在哪里？**

初次渲染：将虚拟DOM节点变成真实DOM节点，然后更新到container中
更新：diff(考虑复用）

可以看到函数中并没有具体的实现，其实它在`legacyRenderSubtreeIntoContainer`中，在看看简化后的源码：

```javascript
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>,
  children: ReactNodeList,
  container: Container,
  forceHydrate: boolean,
  callback: ?Function,
) {

  let root = container._reactRootContainer;
  let fiberRoot: FiberRoot;
  if (!root) {
    // Initial mount
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
    fiberRoot = root;
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // Initial mount should not be batched.
    flushSyncWithoutWarningIfAlreadyRendering(() => {
      updateContainer(children, fiberRoot, parentComponent, callback);
    });
  } else {
    fiberRoot = root;
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // Update
    updateContainer(children, fiberRoot, parentComponent, callback);
  }
  return getPublicRootInstance(fiberRoot);
}
```

上面的`root`变量可以理解成上一次虚拟DOM节点

源码先看到这里，接下来动手实践一番

## 准备工作

为了方便，这里通过`creat-react-app`脚手架演示，创建一个新的项目：

```javascript
npx create-react-app my-app
cd my-app
npm start
```

进入`src`目录下的`index.js`入口文件，改写代码成如下：

```javascript
import ReactDOM from 'react-dom';
import './index.css';

const card = (
  <section className="card">

  <h1>个人信息</h1>

  <div className="field">
    <span>姓名：</span>
    <span>小黄同学</span>
  </div>

  </section>
)

ReactDOM.render(
  card,
  document.getElementById('root')
);
```

index.css样式文件添加如下代码：

```css
.card {
  padding: 30px 50px;
  border: 1px solid #999;
}

.field {
  display: flex;
  justify-content: space-between;
  width: 120px;
}
```

保存后刷新页面，可以看到如下页面：

![](https://i.loli.net/2021/07/17/EUzXhNw9siuGFOL.png)

## 实践

首先我们可以先看看传给render函数的参数具体长什么样

这里我们在根目录新建文件夹`sReactDOM`，在该文件夹下新建`react-dom.js`，添加如下代码：

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

保存后，打开浏览器控制台，刷新页面即可看到：
![](https://i.loli.net/2021/07/17/s8N1ZmHhtwz3OWb.png)

此时看到Card节点的信息，那怎么渲染呢？

**可以根据虚拟DOM节点来构造真实的DOM节点，然后插入到container**

根据这个思路，进行初步实现：

```javascript
const render = (vnode, container) => {
    console.log('%c [ vnode ]', 'font-size:13px; background:pink; color:#bf2c9f;', vnode);

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
    }

    return node;
}

// 生成原生标签节点
const updateHostComponent = (vnode) => {
    const { type, props } = vnode;
    const node = document.createElement(type);
    updateNode(node, props);
    reconcileChildren(node, props.children);
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

export default {
    render
}
```

这一番操作下来后，成功渲染了JSX和文本节点

那函数式组件和类组件可以用同样的思路吗？我们来试试

此时如果将`card`变量改造成`Card`函数式组件，这里改写`index.js`文件：

```javascript
const Card = (props) => {
  return (
    <section className="card">

    <h1>个人信息</h1>

    <div className="field">
      <span>姓名：</span>
      <span>{props.name}</span>
    </div>

    </section>
  )
}


ReactDOM.render(
  <Card name={"小黄同学"}/>,
  document.getElementById('root')
);
```

保存后刷新浏览器，发现报错

![](https://i.loli.net/2021/07/17/YdTay5lOMzPC2hn.png)

同时我们看到此时`vnode`的`type`类型是一个函数

这里我们仔细查看现有的代码，可以分析出在调用`createNode`方法时，没有正确创建DOM节点导致的节点，那我们添加新的逻辑分支：

```javascript
else if (typeof type === 'function') {
    // 函数式组件
    node = updateFunctionComponent(vnode);
}
```

用同样的思路编写`updateFunctionComponent`方法：

```javascript
const updateFunctionComponent = (vnode) => {
    const { type, props } = vnode;
    // 直接调用type方法，生成vnode
    const child = type(props);
    // vnode -> node
    const node = createNode(child);
    return node;
}
```

这样函数式组件也就成功渲染出来了

接下来再看看类组件，继续改造`Card`：

```javascript
class Card extends Component {
  render() {
    return (
      <section className="card">
  
      <h1>个人信息</h1>
  
      <div className="field">
        <span>姓名：</span>
        <span>{this.props.name}</span>
      </div>
   
      </section>
    )
  }
}

ReactDOM.render(
  <Card name={"小黄同学"} />,
  document.getElementById('root')
);
```

保存刷新浏览器，不出意外继续报错：

![](https://i.loli.net/2021/07/17/tUfwGuINEVC7pKm.png)

从报错信息及控制台打印的vnode节点信息可知：当前类组件没有实例化

问题仍然和刚才相似，另外`class`的本质是`function`，它可以看作一个语法糖，让对象原型的写法更加清晰、更像面向对象编程的语法。

接下来怎么解决问题呢？

还记得React源码吗？

```javascript
Component.prototype.isReactComponent = {};
```

这里也是用同样的办法，在文件夹`sReactDOM`下新建`Component.js`，添加如下代码：

```javascript
function Component(props) {
    this.props = props;
};

Component.prototype.isReactComponent = {};

export default Component;
```

**这里要注意this的指向**

`class`的本质是`function`，因此我们继续在如下分支改动：

```javascript
// before
else if (typeof type === 'function') {
    // 函数式组件
    node = updateFunctionComponent(vnode);
}

// after
else if (typeof type === 'function') {
    // 类/函数式 组件
    node = type.prototype.isReactComponent ? updateClassComponent(vnode) : updateFunctionComponent(vnode);
}
```

新增`updateClassComponent`方法：

```javascript
const updateClassComponent = (vnode) => {
    const { type, props } = vnode;
    // 实例化
    const instance = new type(props);
    const child = instance.render();
    // vnode -> node
    const node = createNode(child);
    return node;
}
```

至此，类组件也能成功渲染了

平常开发中，我们还会有使用`Fragment`，它的处理思路基本相同，继续改造`Card`组件：

```javascript
const card = (
  <>
    <section className="card">
    
      <h1>个人信息</h1>

      <div className="field">
        <span>姓名：</span>
        <span>小黄同学</span>
      </div>

    </section>
  </>
)
ReactDOM.render(
  card,
  document.getElementById('root')
);
```

![](https://i.loli.net/2021/07/17/hADyM48Ci1OR7eE.png)

同样看到页面报错及`type`，这里继续添加逻辑分支，补充创建真实节点的逻辑：

```javascript
else {
    // Fragment
    node = updateFragmentComponent(vnode);
}
```

`updateFragmentComponent`实现：

```javascript
const updateFragmentComponent = (vnode) => {
    // 源码中是直接处理子节点
    const node = document.createDocumentFragment();
    reconcileChildren(node, vnode.props.children);
    return node;
}
```

至此，Fragment成功渲染
