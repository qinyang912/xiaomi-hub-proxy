const { getId } = require("./id")

/**
 *
 * @param {{did: string, siid: number, piid: number, value: any, urn: string, varId: string, min: number, max: number, varScope: string, step: number}} options
 * @returns
 */
module.exports = (options) => {
  return {
    "id": `deviceOutput${getId()}`,
    "type": "deviceOutput",
    "props": {
      "did": options.did,
      "siid": options.siid,
      "piid": options.piid,
      ...options.varId != null ? {
        "dtype": "number",
        "id": options.varId,
        "min": options.min,
        "max": options.max,
        "scope": options.varScope,
        "step": options.step,
      } : {
        "value": options.value
      }
    },
    "inputs": {
      "trigger": null
    },
    "outputs": {
      "output": []
    },
    "cfg": {
      "urn": options.urn,
      "pos": {
        "x": 0,
        "y": 0,
        "width": 408,
        "height": 172
      },
      "name": "deviceOutput",
      "version": 1
    }
  }
}
