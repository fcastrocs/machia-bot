const httpsProxyAgent = require("https-proxy-agent");
const axios = require("axios").default;

var now = require("performance-now")
const cookies = `UID=622fcff8-7a2b-439d-8b90-5ec5ab58fffd; physical_dma=511; oid=316955861; vt=52c09b8d-52d8-11eb-83dd-12e56de9e2ab; bby_rdp=l; CTT=4a331db42d3a24e973e2351255b3d364; SID=91344ab1-2443-448c-bf07-3636954e5a5e; rxVisitor=1610237471755C2KS5B5KM409G8HKIU8NO82238D8424R; optimizelyEndUserId=oeu1610237471875r0.3861910066463021; COM_TEST_FIX=2021-01-10T00%3A11%3A12.209Z; c6db37d7c8add47f1af93cf219c2c682=8cb59ce2ad4da8a34977a240946e397c; ZPLANK=e2e1a5b18fe648658137309569dc45a7; ui=1610237473548; G_ENABLED_IDPS=google; pt=3450422659; locDestZip=22191; DYN_USER_CONFIRM=237022829ecf2105e9dab271127ff005; DYN_USER_ID=ATG49420153376; ut=95319138-3feb-11eb-8a3e-0a9eb27aab95; at=eyJhY2Nlc3NUb2tlbiI6IllXTXRoZmREZFZMWUVldUdJUTdTMExaSXc0alpsSDk3a2VTWDNJU3lEZUx6ZUloUTJrTXBBQUFBQUFBQUFBQSIsInRpbWVUb0xpdmUiOjg2NDAwLCJpc3N1ZWRUaW1lc3RhbXAiOjE2MTAyMzc1NDc4OTIsImFzc2VydGlvbiI6InU6Q05hNFBxUGxDZjRoQy10VlBJNTZCUjRmcTFPd1NDa2k5aUJaalljYTBBQSIsInByaW5jaXBhbCI6InU6Q05hNFBxUGxDZjRoQy10VlBJNTZCUjRmcTFPd1NDa2k5aUJaalljYTBBQSIsInByaW5jaXBhbElkZW50aWZpZXIiOiI5NTMxOTEzOC0zZmViLTExZWItOGEzZS0wYTllYjI3YWFiOTUiLCJjb25zdW1hYmxlIjpmYWxzZSwidmVyc2lvbiI6IjEuMCIsImdyaWQiOiJPRFV3WWpJMVpERXlOemhpWXpZeVkyUmxNV0V6WXpnd05tVmpZamswT0RnIn0.fraMuU4ErWLOB5QLSha7calmYA8A20lFvEirbk3EU5XevBfWywPqKzGXgKlMoOEbiO2HpMU1m-tOZ5wPsvMOEA; locStoreId=287; bm_sz=0A6C9932CFEF1255A973B198F61AFF4D~YAAQtvkwF8EBuMZ2AQAAy3y26go1chln1eAkVsraNvpfKkCJq0KTB+ZrkfPsNnJvaFqeUo0jtZYMVFvv8X1rYuFlcTNwfTDIxQFVMFE5lNr2yIOEqsSoefN1hytueWU9mmChWfGx42VoYw+XYfkQVmZBV74l+6fx3fNFQS+1tnfMQ4AMoaR4SQBzf4QaKWZWTw==; bby_prf_csc=be822f17-198c-4bf9-861f-bc4de164ba80; CTE17=T; CTE2=T; customerZipCode=22192|Y; pst2=287; dtCookie=v_4_srv_8_sn_B90RR8UUAKRFM6956OCKSUUG3JDKT2V1_app-3A1531b71cca36e130_1_app-3A1b02c17e3de73d2a_1_app-3A21f5a3c46dc908d0_1_ol_0_perc_100000_mul_1; ltc=10130; bby_suggest_lb=p-suggest-e; bby_prc_lb=p-prc-e; cst_lb=p-cart-cloud; _abck=F2C86634A25871323C58899E744FFE4C~0~YAAQo/kwF7aIwuN2AQAAZzA56wW7XOJswrL4GsEL6m+oFtj7KfKiCF0vDq0kdrJERcmyOS/eNCYuFL3iFwaBqhNImJvt9QMUxdS3HxkR7mdMPy4oyHSHMATfNy0YTZVqBX0SGB1n0q65MOOLgcE7odhCeCNo7vmm2UFgZUomNJX2sDnVtVPSlJDznWJOUnIiI2/DsKnxRSXEvqOChpOVWnfQUo9/hG3MluP50BByqgHiW2aISrPnLZYbumLBPr1NGKYPVELEiieJi9sTKTtQYSMPJZ2hBwhNDfle438yQy90E5xievc0Pkh9gilQzv7f0u5Cg8yggpTKnW2j6tNceemQg1eN+do=~-1~-1~-1; bby_cbc_lb=p-browse-e; bby_loc_lb=p-loc-e; CartItemCount=7; basketTimestamp=1610264174767; dtSa=-; sc-location-v2=%7B%22meta%22%3A%7B%22CreatedAt%22%3A%222021-01-10T00%3A12%3A32.465Z%22%2C%22ModifiedAt%22%3A%222021-01-10T07%3A36%3A31.268Z%22%2C%22ExpiresAt%22%3A%222022-01-10T07%3A36%3A31.268Z%22%7D%2C%22value%22%3A%22%7B%5C%22physical%5C%22%3A%7B%5C%22zipCode%5C%22%3A%5C%2222191%5C%22%2C%5C%22source%5C%22%3A%5C%22C%5C%22%2C%5C%22captureTime%5C%22%3A%5C%222021-01-10T07%3A36%3A28.852Z%5C%22%7D%2C%5C%22store%5C%22%3A%7B%5C%22zipCode%5C%22%3A%5C%2222192%5C%22%2C%5C%22searchZipCode%5C%22%3A%5C%2222191%5C%22%2C%5C%22storeId%5C%22%3A%5C%22287%5C%22%2C%5C%22storeHydratedCaptureTime%5C%22%3A%5C%222021-01-10T07%3A36%3A31.268Z%5C%22%2C%5C%22userToken%5C%22%3A%5C%2295319138-3feb-11eb-8a3e-0a9eb27aab95%5C%22%7D%2C%5C%22destination%5C%22%3A%7B%5C%22zipCode%5C%22%3A%5C%2222191%5C%22%7D%7D%22%7D; rxvt=1610265994098|1610260319822; dtPC=8$464184120_809h-vSRCVUJEMOMCNIUKGCGHKFSCEGRURMDFF-0e11; dtLatC=2`;

(async ()=>{
    var start = now()
    await addToCart();
    var end = now()
    console.log("Add to cart took " + (end-start).toFixed(3) + " milliseconds.")
})();


async function postRequest(options) {
  const httpsAgent = new httpsProxyAgent(
    `http://154.9.130.110:59649`
  );

  let config = {
    url: options.url,
    method: "post",
    data: options.data,
    httpsAgent,
    timeout: 3000,
    headers: {
      accept: "application/json",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/json; charset=UTF-8",
      cookie: cookies,
      origin: options.origin,
      pragma: "no-cache",
      referer:
        "https://www.bestbuy.com/site/apple-airpods-pro-white/5706659.p?skuId=5706659",
      "sec-ch-ua":
        '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
      "sec-ch-ua-mobile": "?",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36",
    },
  };

  return await axios.request(config);
}

async function addToCart() {
  let options = {
    url: "https://www.bestbuy.com/cart/api/v1/addToCart",
    data: { items: [{ skuId: 6418599 }] },
    origin: "https://www.bestbuy.com",
  };

  let res = await postRequest(options);
  if (res.statusText !== "OK") {
    throw "Add to cart failed.";
  }

  if (!res.data.summaryItems) {
    throw "Add to cart failed.";
  }

  let found = false;
  for (let item of res.data.summaryItems) {
    if (item.skuId === "6418599") {
      found = true;
      break;
    }
  }
  if (!found) {
    throw "Add to cart failed.";
  }
}
