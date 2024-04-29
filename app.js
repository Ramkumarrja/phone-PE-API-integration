const express = require("express");
const port = 3007;
const app = express();
require("dotenv").config();
const axios = require("axios");
const uniqid = require("uniqid");
const sha256 = require("sha256");
// const morgan = require("morgan");

const HOST_URL = process.env.PHONE_PE_HOST_URL;
const END_POINT = process.env.PAYENDPOINT;
const MERCHANT_ID = process.env.MERCHANT_ID;
const SALT_KEY = process.env.SALT_KEY;
const SALT_INDEX = process.env.SALT_INDEX;

app.get("/", (req, res) => {
  res.send({ HOST_URL, END_POINT, MERCHANT_ID, SALT_INDEX, SALT_KEY });
});

app.get("/pay", (req, res) => {
  const merchantTransactionId = uniqid();
  const merchantUserId = 271202;
  console.log("Transaction id ::", merchantTransactionId);
  const payLoad = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: merchantUserId,
    amount: 10000,
    redirectUrl: `http:localhost:3007/redirect-url/${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    // "callbackUrl": "https://webhook.site/callback-url",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  //SHA256(Base64 encoded payload + “/pg/v1/pay” + salt key) + ### + salt index
  const bufferObj = Buffer.from(JSON.stringify(payLoad), "utf-8");
  const base64EncodedPayload = bufferObj.toString("base64");
  const xVerify =
    sha256(base64EncodedPayload + END_POINT + SALT_KEY) + "###" + SALT_INDEX;

  const options = {
    method: "post",
    url: `${HOST_URL}${END_POINT}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    data: {
      request: base64EncodedPayload,
    },
  };
  axios
    .request(options)
    .then(function (response) {
      console.log(response.data);
      //   return res.send(response.data)
      const url = response.data.data.instrumentResponse.redirectInfo.url;
      res.redirect(url);
    })
    .catch(function (error) {
      //   console.error(error);
      return res.send(error);
    });
});

app.get("/redirect-url/:paymentid", (req, res) => {
  const paymentId = req.params.paymentid;
  console.log(paymentId);
  if (paymentId) { 
    // SHA256(“/pg/v1/status/{merchantId}/{merchantTransactionId}” + saltKey) + “###” + saltIndex
    const xVerify = sha256(`/pg/v1/status/${MERCHANT_ID}/${paymentId}` + SALT_KEY) + '###' + SALT_INDEX
    const options = {
      method: "get",
      url: `${HOST_URL}pg/v1/status/${MERCHANT_ID}/${paymentId}`,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-MERCHANT-ID": paymentId,
        "X-VERIFY" : xVerify,
      },
    };
    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
      })
      .catch(function (error) {
        console.error(error);
      });
    res.send(paymentId);
  } else {
    res.send({ error: "error occured" });
  }
});
app.listen(port, () => {
  console.log(`INFO :: app listening on the port :: ${port}`);
});
