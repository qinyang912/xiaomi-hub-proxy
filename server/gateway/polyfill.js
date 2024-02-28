globalThis.self = globalThis;
globalThis.crypto = require("node:crypto");
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./.data/scratch');
const WebSocket = require("ws");
globalThis.WebSocket = WebSocket;
globalThis.localStorage = localStorage
globalThis.window = {}
globalThis.window.localStorage = localStorage
globalThis.window.WebSocket = WebSocket


Buffer.prototype.arrayBuffer = function arrayBuffer() {
  const arrayBuffer = new ArrayBuffer(this.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < this.length; ++i) {
    view[i] = this[i];
  }
  return arrayBuffer;
};

const webpackModule = (() => {
  const moduleCache = {
    // 以下是从其他地方注入的包
    25819: (e) => {
      e.exports = crypto;
    },
    46601: () => {},
  };

  self.webpackChunkai_config = [];
  self.webpackChunkai_config.push = (...args) => {
    args.forEach(([, m]) => {
      Object.assign(moduleCache, m);
    });
    Array.prototype.push.call(self.webpackChunkai_config, ...args);
  };

  require('./assets/gateway.58d4a7')
  require('./assets/875.b535cc')
  require('./assets/737.a4eea1')

  const importCache = {};

  const resolve = (moduleId) => {
    if (importCache[moduleId]) return importCache[moduleId].exports;
    const item = (importCache[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {},
    });
    moduleCache[moduleId].call(item.exports, item, item.exports, resolve);
    item.loaded = true;
    return item.exports;
  };

  resolve.d = (e, t) => {
    for (var n in t) {
      resolve.o(t, n) &&
        !resolve.o(e, n) &&
        Object.defineProperty(e, n, {
          enumerable: true,
          get: t[n],
        });
    }
  };

  resolve.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t);

  resolve.g = globalThis;

  resolve.nmd = (e) => {
    e.paths = [];
    if (!e.children) e.children = [];
    return e;
  };

  return {
    resolve,
  };
})();

exports.webpackModule = webpackModule;
