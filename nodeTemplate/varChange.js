const { getId } = require("./id")

/**
 *
 * @param {{preload?: boolean, varId: string, varScope: string, operator: string, v1: number, v2?: number, output: string[]}} options
 * @returns
 */
module.exports = (options) => {
  return {
    "type": "varChange",
    "id": `varChange${getId()}`,
    "cfg": {
      "pos": {
        "x": 0,
        "y": 0,
        "width": 456,
        "height": 162
      },
      "name": "varChange",
      "version": 1
    },
    "props": {
      "preload": options.preload ?? false,
      "id": options.varId,
      "scope": options.varScope,
      "varType": "number",
      "operator": options.operator,
      ...options.v1 != null ? { v1: options.v1 } : {},
      ...options.v2 != null ? { v2: options.v2 } : {},
    },
    "inputs": {},
    "outputs": {
      "output": [
        ...options.output
      ]
    }
  }
}
