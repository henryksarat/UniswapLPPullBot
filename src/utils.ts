const fs = require('fs')
const { BigNumber } = require("bignumber.js");

import { ethers } from 'ethers';

export function writeToFile(data: string) {
    // Write data in 'Output.txt' .
    fs.appendFile('LiquidateOutput.txt', data + '\n', (err: any) => {
        // In case of a error throw err.
        if (err) throw err;
    })
  }

  export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  export function getHumanReadableFromTick(tickToConvert: number, token0Decimals:number, token1Decimals:number) {
  
    const tickToConvertFormatted = -1*tickToConvert
  
    // Calculate the price using BigNumber for precision
    const base = new BigNumber('1.0001');
    const tick = new BigNumber(tickToConvertFormatted);
  
    // Convert base to a native JavaScript number
    const baseNumber = base.toNumber();
  
    // Convert tick to a native JavaScript number
    const tickNumber = tick.toNumber();
  
    // // Calculate the price using Math.log and Math.exp
    const lnBase = Math.log(baseNumber);
    // It's 12 since there is a 12 decimal difference between USDC and eth
    const differenceInDecimals = token0Decimals - token1Decimals
    const priceToken1PerToken0 = Math.exp(lnBase * tickNumber)/Math.pow(10, differenceInDecimals); 
    const priceToken0PerToken1 = 1 / priceToken1PerToken0;
  
  
    return [priceToken1PerToken0, priceToken0PerToken1]
  }

  export async function getAndPrintBalance(wallet: any, provider: any): Promise<string> {
    try{
      const balanceWei = await provider.getBalance(wallet.address);
      const balanceEth = ethers.utils.formatEther(balanceWei);
  
      console.log('balance is=', balanceEth)
      console.log('address is=', wallet.address)
      return balanceEth
    } catch (error) {
      // Handle the error
      console.error('An error occurred getting the balance:', error);
      return "-1";
    }
  }