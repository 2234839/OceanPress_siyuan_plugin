import { Plugin } from "siyuan";
// 插入此变量，vite 将会自动插入热更新代码
import.meta.hot

export default class Test extends Plugin{
    onload(): void {
        console.log(7777);

    }
}