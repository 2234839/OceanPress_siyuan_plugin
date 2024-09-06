/**
 * function name
 */
export enum FUNCTION_NAMES_USER {
  EXPR = "EXPR",
}
/**
 * i18n
 */
export const functionEnUS = {
  formulaCustom: {
    [FUNCTION_NAMES_USER.EXPR]: {
      description: `You can add individual values, cell references or ranges or a mix of all three.`,
      abstract: `Adds its arguments`,
      links: [
        {
          title: "Instruction",
          url: "https://support.microsoft.com/en-us/office/sum-function-043e1c7d-7726-4e80-8f32-07b23e057f89",
        },
      ],
      functionParameter: {
        number1: {
          name: "number1",
          detail:
            "The first number you want to add. The number can be like 4, a cell reference like B6, or a cell range like B2:B8.",
        },
        number2: {
          name: "number2",
          detail:
            "This is the second number you want to add. You can specify up to 255 numbers in this way.",
        },
      },
    },
  },
};

export const functionZhCN = {
  formulaCustom: {
    [FUNCTION_NAMES_USER.EXPR]: {
      description: "将单个值、单元格引用或是区域相加，或者将三者的组合相加。",
      abstract: "求参数的和",
      links: [
        {
          title: "教学",
          url: "https://support.microsoft.com/zh-cn/office/sum-%E5%87%BD%E6%95%B0-043e1c7d-7726-4e80-8f32-07b23e057f89",
        },
      ],
      functionParameter: {
        number1: {
          name: "数值1",
          detail:
            "要相加的第一个数字。 该数字可以是 4 之类的数字，B6 之类的单元格引用或 B2:B8 之类的单元格范围。",
        },
        number2: {
          name: "数值2",
          detail: "这是要相加的第二个数字。 可以按照这种方式最多指定 255 个数字。",
        },
      },
    },
  },
};

import type { Ctor } from "@univerjs/core";
import type {
  ArrayValueObject,
  BaseValueObject,
  IFunctionInfo,
  IFunctionNames,
} from "@univerjs/engine-formula";
import {
  AsyncObject,
  BaseFunction,
  FunctionType,
  NumberValueObject,
  StringValueObject,
} from "@univerjs/engine-formula";

/**
 * description
 */
export const FUNCTION_LIST_USER: IFunctionInfo[] = [
  {
    functionName: FUNCTION_NAMES_USER.EXPR,
    aliasFunctionName: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.aliasFunctionName`,
    functionType: FunctionType.User,
    description: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.description`,
    abstract: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.abstract`,
    functionParameter: [
      {
        name: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.functionParameter.number1.name`,
        detail: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.functionParameter.number1.detail`,
        example: "A1:A20",
        require: 1,
        repeat: 0,
      },
      {
        name: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.functionParameter.number2.name`,
        detail: `formulaCustom.${FUNCTION_NAMES_USER.EXPR}.functionParameter.number2.detail`,
        example: "B2:B10",
        require: 0,
        repeat: 1,
      },
    ],
  },
];

export class CustomAsyncObject extends BaseFunction {
  override calculate(...variants: BaseValueObject[]) {
    return new AsyncObject(asyncObjectFunction(...variants));
  }

  override isAsync(): boolean {
    return true;
  }
}

async function asyncObjectFunction(...variants: BaseValueObject[]) {
  return new Promise((resolve: (value: BaseValueObject) => void) => {
    let accumulatorAll: BaseValueObject = NumberValueObject.create(0);
    for (let i = 0; i < variants.length; i++) {
      let variant = variants[i];

      if (variant.isError()) {
        return variant;
      }

      if (accumulatorAll.isError()) {
        return accumulatorAll;
      }

      if (variant.isArray()) {
        variant = (variant as ArrayValueObject).sum();
      }

      accumulatorAll = accumulatorAll.plus(variant as BaseValueObject);
    }

    resolve(StringValueObject.create(`expr: ${accumulatorAll.getValue()}`));
    return accumulatorAll;
  });
}

// Mapping of algorithms and names
export const functionUser: [[Ctor<BaseFunction>, IFunctionNames]] = [
  [CustomAsyncObject, FUNCTION_NAMES_USER.EXPR],
];
