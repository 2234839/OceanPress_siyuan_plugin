This translation is generated by an AI translation tool.

# Siyuan Expression Plugin

[Chinese Documentation](./README.md) [English Documentation](./README_en.md)

[Usage Documentation](#usage-documentation)

QQ Group: 706761641 (Xin Stack Space)

### Use of this product is permitted only if you agree to the following terms

Trial Agreement:

You may try the product for any length of time. After a month, if you find the product useful, you will lose the trial qualification.

---

Paid Agreement:

During the subscription period, you can use this product.

Considered as a subscription: You have helped the author in any form, you have made a recognized contribution to society, or you are unable to pay.

Subscription amount: Equivalent to 10 RMB, any payment method is acceptable, no time limit (you can decide to pay at any time, but start using it now).

Subscription period: From the time of payment until the right to use the product for one hundred updates or 365 days, whichever is longer, and it is stackable. (That is, if I update more than a hundred times in a very short period, it will be calculated as one year)

[Pay through the Love Power Platform](https://afdian.com/@llej0)

If you do not remember the above agreement, it is not considered a violation of the payment agreement.

---

Prohibition and Disclaimer Agreement:

The use of this product for any illegal or disorderly activities is prohibited.

The author is not responsible for any consequences arising from your use of this product.

## Usage Documentation

Add a custom property `expr` to the block, set the value to a valid JavaScript expression. The plugin will evaluate the expression using `eval`, and the returned value will serve as the block content and the value of the custom property `expr-value`.

If the value is a Promise, the result of the Promise will be used as the block content.

### Automatic Evaluation

The plugin continuously evaluates blocks that have changed, but to avoid generating a large number of calculations and read/write operations, some optimizations have been made based on the block's `update` field. When the plugin is first launched, it will evaluate all expressions once.

After that, every time a tab switch event occurs (switch-protyle), it will evaluate all loaded expression blocks and updated blocks once.

If you do not want the plugin to continuously evaluate, you can temporarily open the developer tools and enter `expr.intervalUpdateSql.set(false)` to turn off automatic evaluation (the tab switch event will still trigger).

Note! [Updating block properties does not cause the block's update field to update](https://github.com/2234839/siyuan_expr/issues/1#issuecomment-2147809646). If you want to trigger evaluation, you can manually modify the block content at will.

### Some special variables that can be directly referenced within expressions

#### expr

Plugin instance

#### block

Expressions can directly input `block` to obtain the data of the block where the expression is located. Properties starting with `a_` are attributes of custom-expr, and the rest are block properties.

```js
const block = {
    a_block_id: "Block ID",
    a_box: "Notebook ID",
    a_id: "Property ID",
    a_name: "custom-expr",
    a_path: "/document ID/document ID/document ID.sy",
    a_root_id: "Document ID",
    a_type: "b",
    a_value: "Expression script",
    alias: "",
    box: "Notebook ID",
    content: "Block content",
    created: "20240605121837",
    fcontent: "",
    hash: "f570917",
    hpath: "Readable path",
    ial: "Block properties"
    id: "Block ID",
    length: 16,
    markdown: "Block content markdown",
    memo: "",
    name: "",
    parent_id: "Parent block ID",
    path: "/document ID/document ID/document ID.sy",
    root_id: "Document ID",
    sort: 10,
    subtype: "",
    tag: "",
    type: "p",
    updated: "20240605134312"
}
```

## Acknowledgements

Special thanks to the following very loving people

[Jeffrey Chen](https://github.com/TCOTC)