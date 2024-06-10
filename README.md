# 为挂件生成快照

此插件用于为挂件生成快照，快照是挂件的静态版本，用于在 OceanPress 生成静态网站时使用。

使用文档参见：[https://shenzilong.cn/想法/项目/OceanPress_js#20231010132148-zw7l2vj](https://shenzilong.cn/想法/项目/OceanPress_js#20231010132148-zw7l2vj)

fetch("http://127.0.0.1:2839/api/asset/getImageOCRText", {
  "body": "{\"path\":\"assets/image-20231010160947-iid0n52.png\",\"force\":true}",
  "method": "POST",
});

fetch("http://127.0.0.1:2839/api/asset/setImageOCRText", {
  "body": "{\"path\":\"assets/image-20231010160947-iid0n52.png\",\"text\":\"D note/#&/IRE/OceanPress js > H2 22RaSASRIBIRIGc oceanPress web uin=\"}",
  "method": "POST",
});