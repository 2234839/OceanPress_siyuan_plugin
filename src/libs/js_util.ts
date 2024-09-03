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
export function generateTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]
    .map((part) => part.toString().padStart(2, "0"))
    .join("");
}
export function encodeHTML(str: string) {
  return str.replace(/[&<>"'\n]/g, function (match) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "\n": "_esc_newline_",
    }[match]!;
  });
}

export function generateUniqueId() {
  // 生成随机字符串
  const randomString = Math.random().toString(36).substring(2, 9);

  // 组合成最终的 ID
  return `${generateTimestamp()}-${randomString}`;
}