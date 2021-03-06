// NPM Dependencies
// import { NextApiResponse, NextApiRequest } from "next";

// Util Dependencies
import { twitterAPI } from '../../util/twitter';
import { bigsunAPI, blockchainComAPI } from '../../util/api';
import { sats2BTC, BTC2USD, calcOverpayRatio } from '../../util/helpers';

export default async (req, res) => {
  const auth = req.headers.authorization;
  const isTest = req.query.test

  if (auth === process.env.AUTH_KEY) {
    try {
      const { data: feeData } = await bigsunAPI.get("/days?order=day.desc");
      const {
        total_n,
        total_amount,
        overpaid_n,
        overpaid_amount,
        overpaid_chain_fee,
        overpaid_ln_fee
      } = feeData[0];
      const overpaidChainFeeBTC = sats2BTC(overpaid_chain_fee, 2);
      const overpaidLNFeeBTC = sats2BTC(overpaid_ln_fee);

      const { data: priceData } = await blockchainComAPI.get("/ticker");
      const USDPrice = priceData.USD.last;
      const overpaidChainFeeUSD = BTC2USD(overpaidChainFeeBTC, USDPrice);
      const overpaidLNFeeUSD = BTC2USD(overpaidLNFeeBTC, USDPrice)
      const overpayRatio = calcOverpayRatio(overpaid_chain_fee, overpaid_ln_fee);

      const status = `Yesterday, Bitcoin users paid ${overpaidChainFeeBTC} BTC in fees ($${overpaidChainFeeUSD} USD) for transactions which could have been transferred over Lightning Network for ${overpaidLNFeeBTC} BTC ($${overpaidLNFeeUSD} USD), overpaying by ${overpayRatio}`;

      if (isTest === 'true') {
        res.status(200).json({
          text: status
        })
      } else {
        const { id, text, created_at } = await twitterAPI.post("statuses/update", { status });

        res.status(200).json({
          id,
          text,
          created_at
        });
      }
    } catch (err) {
      res.status(500).json({
        err
      });
    }
  } else {
    return res.status(400).send('Unauthorized');
  }
}
