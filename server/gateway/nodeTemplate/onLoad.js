const { getId } = require("./id")

/**
 *
 * @param {{output: string[]}} options
 * @returns
 */
module.exports = (options) => {
  return {
    "id": `onLoad${getId()}`,
    "type": "onLoad",
    "cfg": {
      "pos": {
        "x": 0,
        "y": 0,
        "width": 160,
        "height": 98
      },
      "name": "onLoad",
      "version": 0
    },
    "props": {},
    "inputs": {},
    "outputs": {
      "output": [
        ...options.output,
      ]
    }
  }
}
