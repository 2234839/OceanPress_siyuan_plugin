type aliasAttribute = { [K in keyof attribute as `a_${K}`]: attribute[K] };
/** 合并了block和attribute，其中attribute的属性key前面添加了`a_` */
export type MergedBlock = aliasAttribute & Block;
