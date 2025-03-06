type aliasAttribute = { [K in keyof attribute as `a_${K}`]: attribute[K] };
/** 合并了从数据库中查询的 block 和block 对应的 expr 属性名的 attribute 表记录，其中attribute的属性key前面添加了`a_` */
export type MergedBlock = aliasAttribute & Block;
