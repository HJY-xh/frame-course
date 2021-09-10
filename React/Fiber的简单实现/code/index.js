import React from 'react';
// import ReactDOM from 'react-dom';
import ReactDOM from './sReactDOM/react-dom';
import './index.css';


/**
 * 
 * @function 函数组件
 */

const FunctionComponent = (props) => {
  return (
    <div>
        这是函数组件
    </div>
  )
}

/**
 * 
 * @function 类组件
 */
class ClassComponent extends React.Component {
  render() {
    return (
      <div>
        这是类组件
      </div>
    )
  }
}

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
    <FunctionComponent />
    <ClassComponent />
  </section>
)

ReactDOM.render(
  content,
  document.getElementById('root')
);
