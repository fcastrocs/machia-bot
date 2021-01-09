const axios = require("axios");

class Proxy {}
Proxy.current = 0;
Proxy.list = new Array();

Proxy.get = () => {
  if (!Proxy.list) {
    throw "Proxy list is empty.";
  }
  if (Proxy.current == Proxy.list.length) {
    Proxy.current = 0;
  }
  return Proxy.list[Proxy.current++];
};

Proxy.fetch = async () => {
  if (Proxy.list.length > 0) return;
  try {
    var res = await axios.get(process.env.PROXY_SERVICE_URL);
  } catch (err) {
    throw "Couldn't fetch proxies.";
  }

  Proxy.list = res.data.split(/\r?\n/);
};

module.exports = Proxy;
