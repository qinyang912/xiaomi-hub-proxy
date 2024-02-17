const { getId } = require("./id")

/**
 *
 * @param {{interval: number, output: string[]}} options
 * @returns
 */
module.exports = (options) => {
  return {
    "id": `loop${getId()}`,
    "type": "loop",
    "cfg": {
      "unit": "s",
      "value": options.interval / 1000,
      "pos": {
        "x": 0,
        "y": 0,
        "width": 510,
        "height": 140
      },
      "name": "loop",
      "version": 1
    },
    "props": {
      "interval": options.interval
    },
    "inputs": {
      "start": null,
      "stop": null
    },
    "outputs": {
      "output": [
        ...options.output,
      ]
    }
  }
}
