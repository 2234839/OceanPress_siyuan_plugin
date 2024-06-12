export function debounce(fn: Function, delay: number) {
  // 保存定时器的ID
  let timerId: any;

  // 返回一个新的函数，这个函数将在延迟时间后执行传入的函数fn
  return function (this: any, ...args: any) {
    // 每次触发事件时，如果存在定时器，先清除之前的定时器
    if (timerId) {
      clearTimeout(timerId);
    }

    // 设置一个新的定时器
    timerId = setTimeout(() => {
      // 延迟时间后执行传入的函数，并传入相应的参数
      fn.apply(this, args);
    }, delay);
  };
}
