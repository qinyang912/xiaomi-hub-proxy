const { getId } = require("./id")

/**
 * @param {{ urn: string, did: string, siid: number, piid: number, varId: string, varScope: string }} options
 */
module.exports = (options) => {
  return {
    "type": "deviceGetSetVar",
    "id":  `deviceGetSetVar${getId()}`,
    "cfg": {
      "urn": options.urn,
      "pos": {
        "x": 0,
        "y": 0,
        "width": 574,
        "height": 172
      },
      "name": "deviceGetSetVar",
      "version": 0
    },
    "props": {
      "did": options.did,
      "siid": options.siid,
      "piid": options.piid,
      "dtype": "number",
      "id": options.varId,
      "scope": options.varScope
    },
    "inputs": {
      "input": null
    },
    "outputs": {
      "output": []
    }
  }
}
