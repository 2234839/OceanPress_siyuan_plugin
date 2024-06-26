export function synchronousFetch(url: string, data: any):Promise<string> {
  return new Promise((resolve, reject) => {
    // 创建一个新的 XMLHttpRequest 对象
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, false); // 第三个参数设置为 false 以启用同步请求

    xhr.onload = function () {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(xhr.statusText));
      }
    };
    xhr.onerror = function () {
      reject(new Error("Request error"));
    };
    xhr.send(JSON.stringify(data));
  });
}
