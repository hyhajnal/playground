import React, { useState, useEffect } from 'react';
import styles from './index.less';

export default () => {
  const [count, setCount] = useState(0);

  // 相当于 componentDidMount 和 componentDidUpdate:
  useEffect(() => {
    document.title = `${count} times You clicked`;
  });

  return (
    <div>
      <p>当前点击次数：{count}</p>
      <button onClick={() => setCount(count + 1)}>点击</button>
    </div>
  );
}
