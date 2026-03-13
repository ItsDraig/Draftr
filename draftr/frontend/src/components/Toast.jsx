import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';

const Toast = forwardRef(function Toast(_props, ref) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef(null);

  const show = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useImperativeHandle(ref, () => ({ show }), [show]);

  return (
    <div className={`toast${visible ? ' show' : ''}`}>{message}</div>
  );
});

export default Toast;
