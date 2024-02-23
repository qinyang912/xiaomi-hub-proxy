class RC4 {
  constructor(pwd) {
    this._idx = 0;
    this._jdx = 0;
    this._ksa = [];
    this.init_key(pwd);
  }

  init_key(pwd) {
    const cnt = pwd.length;
    let ksa = [...Array(256).keys()];
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + ksa[i] + pwd[i % cnt]) & 255;
        [ksa[i], ksa[j]] = [ksa[j], ksa[i]];
    }
    this._ksa = ksa;
    this._idx = 0;
    this._jdx = 0;
  }

  crypt(data) {
    if (typeof data === 'string') {
        data = Buffer.from(data, 'binary');
    }
    const ksa = this._ksa;
    let i = this._idx;
    let j = this._jdx;
    const out = [];
    for (const byt of data) {
        i = (i + 1) & 255;
        j = (j + ksa[i]) & 255;
        [ksa[i], ksa[j]] = [ksa[j], ksa[i]];
        out.push(byt ^ ksa[(ksa[i] + ksa[j]) & 255]);
    }
    this._idx = i;
    this._jdx = j;
    return Buffer.from(out);
  }

  init1024() {
    this.crypt(Buffer.alloc(1024));
    return this;
  }
}

exports.RC4 = RC4
