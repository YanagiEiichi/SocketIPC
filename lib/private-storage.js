class PrivateStorage extends WeakMap {
  get(key) {
    let value = super.get(key);
    if (value === void 0) super.set(key, value = {});
    return value;
  }
}

module.exports = new PrivateStorage();
