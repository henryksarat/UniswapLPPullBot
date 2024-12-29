import { ethers } from 'ethers';
import * as uniswap_functions from './src/uniswap_functions'
import * as uni_config from './config/uni_config'
import * as utils from './src/utils'
import * as index from './index'

const INONFUNGIBLE_POSITION_MANAGER = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");

// Constants
const RPC_URL = uni_config.RPC_URL;
const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS = uni_config.NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS;
const PRIVATE_KEY = uni_config.PRIVATE_KEY;
const CHAIN_ID = uni_config.CHAIN_ID;
const SLEEP_TIME = uni_config.SLEEP_TIME;

const PROVIDER = new ethers.providers.JsonRpcProvider(RPC_URL)

const nfpmContract = new ethers.Contract(
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    INONFUNGIBLE_POSITION_MANAGER.abi,
    PROVIDER
)

const wallet = createWallet(PRIVATE_KEY)
console.log(wallet.address)
main(PROVIDER, wallet, 1)

function createWallet(privateKey: string) {
    return new ethers.Wallet(privateKey, PROVIDER)
}

async function main(provider: any, wallet: any, exitAt: number) {
    const positonIds = await uniswap_functions.getPositionIds(nfpmContract, wallet.address);

    while(true) {
        try {
          const positions = await uniswap_functions.getPositions(
            PROVIDER, 
            nfpmContract, 
            positonIds, 
            CHAIN_ID
          )
          if (positions.length <= exitAt) {
              console.error('reached limit with length:', positions.length)
              break
          }
          await printToScreen(positions, wallet.address)
          await filterAndExecuteLiquidate(provider, positions, 'WETH', 'USDC')
          await filterAndExecuteLiquidate(provider, positions, 'WBTC', 'USDC')
          await filterAndExecuteLiquidate(provider, positions, 'USDC', 'LINK')
          console.log("finished checking...", new Date().toLocaleString())
          await utils.delay(SLEEP_TIME);
        } catch (error) {
          console.error('got an error thrown up, error:', error)
          console.log("So will continue on, time is...", new Date().toLocaleString())
        }
    }
}

export async function filterAndExecuteLiquidate(provider: any, positions: any, token0: string, token1: string) {
    var atLestOneExecution = false
    for (let positionInfo of positions) {
        if(positionInfo.isOpen 
            && positionInfo.token0.symbol == token0 
            && positionInfo.token1.symbol == token1 
            && positionInfo.rangeStatus == uniswap_functions.RANGE_STATUS.BELOW_RANGE
        ) {
            console.log('WE SHOULD LIQUIDATE NOW! Token=', positionInfo.tokenId)
            index.executeLiquidate(provider, positionInfo.tokenId, false)
            atLestOneExecution = true
        }
    }

    return atLestOneExecution
}

async function printToScreen(positions: any, walletAddress: string) {
    for (let positionInfo of positions) {
      if(positionInfo.isOpen) {
        const currentTickPrice = utils.getHumanReadableFromTick(positionInfo.currentTickPool, positionInfo.token0.decimals, positionInfo.token1.decimals)[0]
        const currentTickPriceOther = utils.getHumanReadableFromTick(positionInfo.currentTickPool, positionInfo.token0.decimals, positionInfo.token1.decimals)[1]
  
        
        console.log('------')
        console.log("TokenId=%s\nRangeStatus=%s,\nToken0=%s,\nToken1=%s,\nFee=%s,\nPrice1=%s\nPrice2=%s\n[Address=%s]", 
          positionInfo.tokenId, 
          positionInfo.rangeStatus, 
          positionInfo.token0.symbol, 
          positionInfo.token1.symbol, 
          positionInfo.fee, 
          currentTickPrice, 
          currentTickPriceOther, 
          positionInfo.poolAddress
        )
        console.log("Liquidity=%s", positionInfo.liquidity)
  
  
        const fees = await uniswap_functions.getFeesToCollect(nfpmContract, positionInfo.tokenId, walletAddress, positionInfo.token0, positionInfo.token1)
        console.log('Fee 0 =', fees.fee0)
        console.log('Fee 1 =', fees.fee1)
        
        console.log('------')
      }
    }
  }  

  export async function executeLiquidate(provider: any, tokenId: number, safeMode: boolean) {
    const positionInfo = await uniswap_functions.getPositionAmounts(
      nfpmContract, 
      provider,
      tokenId, 
      wallet, 
      CHAIN_ID
    );
    const percent = 100;
  
    console.log('------Time to liquidate-----')
    console.log(`Amount of ${positionInfo.token0Symbol}: ${positionInfo.amount0}`);
    console.log(`Amount of ${positionInfo.token1Symbol}: ${positionInfo.amount1}`);
  
    const beforeEthBalance = await utils.getAndPrintBalance(wallet, provider)
    const feesToCollect = await uniswap_functions.getFeesToCollect(nfpmContract, tokenId, wallet.address, positionInfo['tokenA'], positionInfo['tokenB'])
  
    console.log('Fee 0 =', feesToCollect.fee0)
    console.log('Fee 1 =', feesToCollect.fee1)
  
    const receipt = await uniswap_functions.removePosition(
      PROVIDER,
      wallet,
      positionInfo.tokenId,
      positionInfo.tokenA,
      positionInfo.tokenB,
      positionInfo.position,
      percent,
      safeMode
    )
  
    console.log('Transaction hash=', receipt.transactionHash)
  
    const currentDate = new Date().toLocaleString()
  
    await utils.delay(10000);
  
    const afterEthBalance = await utils.getAndPrintBalance(wallet, PROVIDER)
  
    var obj = {
      currentDate: currentDate,
      tokenId: positionInfo['tokenId'],
      percent: percent,
      beforeEthBalance: beforeEthBalance,
      afterEthBalance: afterEthBalance,
      symbol0: positionInfo.token0Symbol,
      symbol1: positionInfo.token1Symbol,
      fee0: feesToCollect.fee0,
      fee1: feesToCollect.fee1,
      transactionHash: receipt.transactionHash,
    };
    
    const output = JSON.stringify(obj);
  
    utils.writeToFile(output)
  
    console.log('------Time to liquidate-----')
  }

  // This is just around for testing out unit tests and mocking
  export async function me() {
    return 10
  }
  
  export async function add2(a: number, b: number): Promise<number> {
    return a + b;
  }
  
  export function add(a: number, b: number): number {
    return a + b;
  }
  
