const RAZORPAY_ORDER_URL = "https://api.razorpay.com/v1/orders";

function parseRequestBody(req) {
  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (error) {
      body = {};
    }
  } else if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString("utf8") || "{}");
    } catch (error) {
      body = {};
    }
  }
  return body;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keyId || !keySecret) {
      res.status(500).json({
        error: "Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      });
      return;
    }

    const body = parseRequestBody(req);
    const amountRupees = Number(body.amountRupees || 0);
    const amount = Math.round(amountRupees * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: "Valid amountRupees is required." });
      return;
    }

    const orderPayload = {
      amount,
      currency: "INR",
      receipt: `gww_${Date.now()}`,
      notes: {
        workerId: String(body.workerId || ""),
        workerEmail: String(body.workerEmail || ""),
        cycle: String(body.cycle || "")
      }
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorpayResponse = await fetch(RAZORPAY_ORDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await razorpayResponse.json().catch(() => ({}));
    if (!razorpayResponse.ok) {
      res.status(razorpayResponse.status).json({
        error: data?.error?.description || "Failed to create Razorpay order."
      });
      return;
    }

    res.status(200).json({
      order: {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        notes: data.notes || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error?.message || "Unexpected Razorpay order error."
    });
  }
};

