import React from 'react';
// import ReactDOM from 'react-dom';
import ReactDOM from './sReactDOM/react-dom';
// import Component from './sReactDOM/Component';
import './index.css';

/**
 * 
 * @function JSX
 */

// const card = (
//   <section className="card">

//   <h1>个人信息</h1>

//   <div className="field">
//     <span>姓名：</span>
//     <span>小黄同学</span>
//   </div>

//   </section>
// )

// ReactDOM.render(
//   card,
//   document.getElementById('root')
// );



/**
 * 
 * @function 函数式组件
 */

// const Card = (props) => {
//   return (
//     <section className="card">

//     <h1>个人信息</h1>

//     <div className="field">
//       <span>姓名：</span>
//       <span>{props.name}</span>
//     </div>

//     </section>
//   )
// }



/**
 * 
 * @function 类组件
 */
// ReactDOM.render(
//   <Card name={"小黄同学"}/>,
//   document.getElementById('root')
// );

// class Card extends Component {
//   render() {
//     return (
//       <section className="card">
  
//       <h1>个人信息</h1>
  
//       <div className="field">
//         <span>姓名：</span>
//         <span>{this.props.name}</span>
//       </div>
   
//       </section>
//     )
//   }
// }

// ReactDOM.render(
//   <Card name={"小黄同学"} />,
//   document.getElementById('root')
// );


/**
 * 
 * @function Fragment
 */

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
