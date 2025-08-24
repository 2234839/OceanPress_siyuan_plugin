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

/** 生成思源使用的唯一id */
export function generateUniqueId() {
  // 生成随机字符串
  const randomString = Math.random().toString(36).substring(2, 9);

  // 组合成最终的 ID
  return `${generateTimestamp()}-${randomString}`;
}

interface ResultItem {
  path: string;
  key: string;
  value: any;
  matchType: "key" | "value";
}
/** 递归查找对象属性key或者value 中是否存在 指定的字符串 */
export function findKeysAndValuesWithString(
  obj: Record<string, any>,
  searchString: string,
): ResultItem[] {
  const result: ResultItem[] = [];
  const visited = new WeakSet();

  function traverse(currentObj: Record<string, any>, path: string[] = []): void {
    if (typeof currentObj !== "object" || currentObj === null || visited.has(currentObj)) {
      return;
    }

    visited.add(currentObj);
    const list = Object.entries(currentObj);
    if (currentObj?.children) {
      list.push(["children", currentObj?.children] as [string, any]);
    }
    for (const [key, value] of list) {
      const currentPath = [...path];

      if (/^\d+$/.test(key)) {
        currentPath.push(`[${key}]`);
      } else {
        currentPath.push(key);
      }

      const fullPath = currentPath.join(".").replace(/\.(\[\d+\])/g, "$1");

      if (key.includes(searchString)) {
        result.push({
          path: fullPath,
          key: key,
          value: value,
          matchType: "key",
        });
      }

      if (typeof value === "string" && value.includes(searchString)) {
        result.push({
          path: fullPath,
          key: key,
          value: value,
          matchType: "value",
        });
      }

      if (typeof value === "object" && value !== null) {
        traverse(value, currentPath);
      }
    }
  }

  traverse(obj);
  return result;
}
export function getValueByPath(obj: Record<string, any>, path: string): any {
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let current: any = obj;

  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
