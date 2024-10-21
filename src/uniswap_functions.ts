import { ethers } from 'ethers';

import { ERC20Information } from './erc20_basic'
import * as erc20_basic from './erc20_basic'
import * as uni_config from '../config/uni_config'
import * as utils from './utils'

const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS = uni_config.NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS

const JSBI = require('jsbi');
const { Percent } = require('@uniswap/sdk-core')
const { NonfungiblePositionManager } = require('@uniswap/v3-sdk');
const IUniswapV3PoolABI = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const { Pool } = require('@uniswap/v3-sdk');
const { Token } = require('@uniswap/sdk-core');
const { CurrencyAmount } = require('@uniswap/sdk-core')
const { Position, nearestUsableTick } = require('@uniswap/v3-sdk');

export const RANGE_STATUS = Object.freeze({
    BELOW_RANGE:   Symbol("BELOW_RANGE"),
    IN_RANGE:  Symbol("IN_RANGE"),
    ABOVE_RANGE: Symbol("ABOVE_RANGE"),
    NO_RANGE: Symbol("NO_RANGE"),
  });

  interface BasicPoolInfo {
    sqrtPriceX96: ethers.BigNumber;
    tick: number;
    liquidityPool: ethers.BigNumber;
  }

function rangeFactor(tickLower: number, tickUpper: number, currentTick: number) {
    var rangeStatus = RANGE_STATUS.NO_RANGE

    if (currentTick > tickLower && currentTick < tickUpper) {
        rangeStatus = RANGE_STATUS.IN_RANGE
    } else if (currentTick > tickUpper) {
        rangeStatus = RANGE_STATUS.ABOVE_RANGE
    } else if (currentTick < tickLower) {
        rangeStatus = RANGE_STATUS.BELOW_RANGE
    } 

    return rangeStatus
}

export async function getPositionIds(nfpmContract:any, ownerAddress: string): Promise<any> {
    const numPositions: any = await nfpmContract.balanceOf(ownerAddress)

    const calls = []
    for (let i = 0; i < numPositions; i++) {
        calls.push(
            nfpmContract.tokenOfOwnerByIndex(ownerAddress, i)
        )
    }

    const positionIds: any = await Promise.all(calls)
    return positionIds
}


export async function getCurrentTick(provider:any, poolAddress: string, token0: any, token1: any) {
    var poolContract;
    try{
      poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, provider);
    } catch (error) {
      // Handle the error
      console.error('An error occurred getting the pool contract:', error);
      throw error
    }
  
    const [liquidity, slot0, token0Address, token1Address] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
      poolContract.token0(),
      poolContract.token1(),
    ]);

    const tickspacing = await poolContract.tickSpacing()
    const poolFee =  await poolContract.fee()
    const PoolImmutables = {
      factory: await poolContract.factory(),
      token0: token0Address,
      token1: token1Address,
      fee: poolFee,
      tickSpacing: tickspacing,
      maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
    };
  
    const pool = new Pool(
      token0,
      token1,
      PoolImmutables.fee,
      slot0[0], // sqrtPriceX96
      liquidity,
      slot0[1] // tick
    );
    
    return pool.tickCurrent
  }

  export async function getPoolInfo(poolAddress: string, provider: any) {
    var poolContract;
    try{
      poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, provider);
    } catch (error) {
      // Handle the error
      console.error('An error occurred getting the pool contract:', error);
      throw error
    }
  
    const [liquidity, slot0, token0Address, token1Address, fee] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee()
    ]);
  
    const token0Info = await ERC20Information(token0Address, provider)
    const token1Info = await ERC20Information(token1Address, provider)
    
    return {
      'address': poolAddress,
      'token0': token0Address,
      'token1': token1Address,
      'fee': fee,
      'liquidity': liquidity,
      'slot0': slot0,
      'sqrtPriceX96': slot0.sqrtPriceX96.toString(),
      'decimal0': token0Info.decimals,
      'decimal1': token1Info.decimals,
      'symbol0': token0Info.symbol,
      'symbol1': token1Info.symbol,
    }
  }

  export async function getFeesToCollect(nfpmContract:any, tokenIdNumber: number, ownerAddress: string, token0: any, token1: any) {
    const MAX_UINT128 = BigInt(2) ** BigInt(128) - BigInt(1);
    var results = await nfpmContract.callStatic.collect({tokenId: tokenIdNumber,
      recipient: ownerAddress, 
      amount0Max: MAX_UINT128, 
      amount1Max: MAX_UINT128}, {from: ownerAddress});
    return {
      'fee0': results.amount0.toNumber()/10**token0.decimals,
      'fee1': results.amount1.toNumber()/10**token1.decimals
    }
  }

  export async function getPositions(provider: any, nfpmContract: any, positionIds: any, chainId: number) {
    const positionCalls = []
  
    for (let id of positionIds) {
        positionCalls.push(
            nfpmContract.positions(id)
        )
    }
  
    const callResponses = await Promise.all(positionCalls)
  
    const positionInfos = []
  
    for(let i=0; i < callResponses.length; i++) {
      const position = callResponses[i]
  
      if(JSBI.BigInt(position.liquidity)[0] == undefined) {
        continue;
      }
  
      const token0Info = await ERC20Information(position.token0, provider)
      const token1Info = await ERC20Information(position.token1, provider)
      
      const token0 = new Token(chainId, token0Info.address, token0Info.decimals, token0Info.symbol, token0Info.name);
      const token1 = new Token(chainId, token1Info.address, token1Info.decimals, token1Info.symbol, token1Info.name);
        
      const [lowerTickPriceToken1, lowerTickPriceToken0] = utils.getHumanReadableFromTick(position.tickLower, token0Info.decimals, token1Info.decimals)
      const [upperTickPriceToken1, upperTickPriceToken0] = utils.getHumanReadableFromTick(position.tickUpper, token0Info.decimals, token1Info.decimals) 
   
      const poolAddressGet = Pool.getAddress(
        token0, 
        token1, 
        position.fee
      )
  
      const currentTick = await getCurrentTick(provider, poolAddressGet, token0, token1)
      var rangeStatus = rangeFactor(position.tickLower, position.tickUpper, currentTick)
  
      const mapping = {
        tickLower: [position.tickLower, lowerTickPriceToken1, lowerTickPriceToken0],
        tickUpper: [position.tickUpper, upperTickPriceToken1, upperTickPriceToken0],
        liquidity: JSBI.BigInt(position.liquidity),
        feeGrowthInside0LastX128: JSBI.BigInt(position.feeGrowthInside0LastX128),
        feeGrowthInside1LastX128: JSBI.BigInt(position.feeGrowthInside1LastX128),
        tokensOwed0: JSBI.BigInt(position.tokensOwed0),
        tokensOwed1: JSBI.BigInt(position.tokensOwed1),
        isOpen: JSBI.BigInt(position.liquidity)[0] != undefined,
        rangeStatus: rangeStatus,
        token0: token0,
        token1: token1,
        fee: position.fee,
        poolAddress: poolAddressGet,
        currentTickPool: currentTick,
        tokenId: positionIds[i]
      }
      positionInfos.push(mapping)
    }
    
    return positionInfos
  }

  export async function removePosition(
    provider: any, 
    wallet: any, 
    tokenId: number, 
    tokenA: any, 
    tokenB: any, 
    position: any, 
    percent: any,
    safeMode: boolean,
  ) {
  
    const collectOptions = {
      expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(tokenA, 0),
      expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(tokenB, 0),
      recipient: wallet.address,
    }
  
    const removeLiquidityOptions = {
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
      tokenId: tokenId,
      // percentage of liquidity to remove
      liquidityPercentage: new Percent(percent, 100),
      collectOptions,
    }
  
    const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
      position,
      removeLiquidityOptions
    )
  
    var gasPrice;
  
    try {
      gasPrice = await provider.getGasPrice();
    } catch (error) {
      // Handle the error
      console.error('An error occurred getting the gas price:', error);
      throw error
    }
  
    const transaction = {
      data: calldata,
      to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      value: value,
      from: wallet.address,
      gasLimit: ethers.BigNumber.from(tokenId),
      gasPrice: gasPrice,
    }
  
    if (!safeMode) {
      const tx = await wallet.sendTransaction(transaction);
      const receipt = await tx.wait();
  
      return receipt
    } else {
      return {
        'transactionHash': 'Running in Safe Mode so no Transaction Hash'
      }
    }
  }

  export async function createPoolContract(poolAddress: string, provider: ethers.providers.Provider): Promise<BasicPoolInfo> {
    try {
      const poolContract = new ethers.Contract(poolAddress, [
        'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
        'function liquidity() view returns (uint128)'
      ], provider);

      const { sqrtPriceX96, tick } = await poolContract.slot0();
      const liquidityPool = await poolContract.liquidity();
      
      return {
        sqrtPriceX96,
        tick,
        liquidityPool,
      };
    } catch (error) {
      console.error('An error occurred getting the info for the pool including liquidity:', error);
      throw error;
    }
  }

  export async function getPositionAmounts(
    nfpmContract: ethers.Contract,
    provider: ethers.providers.Provider,
    tokenId: number,
    wallet: any,
    chainId: number
  ) {
    const signer = wallet;
    // Fetch position info from the NonfungiblePositionManager
    const positionInfo = await nfpmContract.positions(tokenId);
    const { liquidity, tickLower, tickUpper, token0, token1, fee } = positionInfo;
  
    var token0Contract = await erc20_basic.getSymbolAndDocimalsForToken(provider, token0)
    var token1Contract = await erc20_basic.getSymbolAndDocimalsForToken(provider, token1)
  
  
    const token0Decimals = token0Contract.decimals;
    const token1Decimals = token1Contract.decimals;
  
    const token0Symbol = token0Contract.symbol;
    const token1Symbol = token1Contract.symbol;
  
    // Create Token instances for Uniswap V3 SDK
    const tokenA = new Token(chainId, token0, token0Decimals, token0Symbol);
    const tokenB = new Token(chainId, token1, token1Decimals, token1Symbol);

    // Fetch pool data (assuming the pool exists and is initialized)
    const poolAddress = Pool.getAddress(tokenA, tokenB, fee);
  
    const poolContract = await createPoolContract(poolAddress, provider);
  
    // Create Pool instance
    const pool = new Pool(
      tokenA, 
      tokenB, 
      fee, 
      JSBI.BigInt(poolContract.sqrtPriceX96.toString()), 
      JSBI.BigInt(poolContract.liquidityPool.toString()), 
      poolContract.tick
    );
  
    // Create Position instance
    const position = new Position({
        pool: pool,
        liquidity: JSBI.BigInt(liquidity.toString()),
        tickLower: nearestUsableTick(tickLower, pool.tickSpacing),
        tickUpper: nearestUsableTick(tickUpper, pool.tickSpacing),
    });
  
    const amount0 = position.amount0.toFixed(token0Decimals);
    const amount1 = position.amount1.toFixed(token1Decimals);
  
    return {
      tokenA: tokenA,
      tokenB: tokenB,
      tokenId: tokenId,
      position: position,
      currentTick: poolContract.tick,
      token0Symbol: token0Symbol,
      token1Symbol: token1Symbol,
      amount0: amount0,
      amount1: amount1
    }
  }
