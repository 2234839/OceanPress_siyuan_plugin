# 思源文档转视频插件

此插件用于辅助思源文档转视频，搭配 https://github.com/2234839/sy2video 项目使用

目前提供以下功能：

- 通过 url 参数来让页面只显示指定的块，会自动调整元素大小，使得高度和iframe 高度相同
    需要配置url参数：

    block_show (有此参数则功能生效)
    block_id
    例如：http://127.0.0.1:6809/stage/build/desktop/?block_show=1&block_id=20240621163257-fp4jwg8


## 副作用

因为是基于超级块进行解析的，所以为了方便显示会给超级块加上边框