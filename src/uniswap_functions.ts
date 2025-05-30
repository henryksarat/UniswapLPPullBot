import { ethers, BigNumber } from 'ethers';

import { ERC20Information } from './erc20_basic'
import * as erc20_basic from './erc20_basic'
import * as uni_config from '../config/uni_config'
import * as utils from './utils'


const NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS = uni_config.NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS

const JSBI = require('jsbi');
const { Percent } = require('@uniswap/sdk-core')
const { NonfungiblePositionManager } = require('@uniswap/v3-sdk');
const IUniswapV3PoolABI = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
const { Pool , priceToClosestTick} = require('@uniswap/v3-sdk');
const { Token, Price } = require('@uniswap/sdk-core');
const { CurrencyAmount } = require('@uniswap/sdk-core')
const { Position, nearestUsableTick } = require('@uniswap/v3-sdk');


const UNISWAP_V3_POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
];

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

export function rangeFactor(
  tickLower: number, 
  tickUpper: number, 
  currentTick: number,
  decimal0: number,
  decimal1: number
) {
    var rangeStatus = RANGE_STATUS.NO_RANGE
    if (decimal0 > decimal1) { // Example is WETH/USDC, decimal0=18, decimal1=6
      if (currentTick > tickLower && currentTick < tickUpper) {
          rangeStatus = RANGE_STATUS.IN_RANGE
      } else if (currentTick > tickUpper) {
          rangeStatus = RANGE_STATUS.ABOVE_RANGE
      } else if (currentTick < tickLower) {
          rangeStatus = RANGE_STATUS.BELOW_RANGE
      } 
    } else {
      if (currentTick > tickLower && currentTick < tickUpper) {
        rangeStatus = RANGE_STATUS.IN_RANGE
      } else if (currentTick > tickUpper) {
        rangeStatus = RANGE_STATUS.BELOW_RANGE  
      } else if (currentTick < tickLower) {
        rangeStatus = RANGE_STATUS.ABOVE_RANGE
      }
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
    console.log('results before for fees=')
    var results = await nfpmContract.callStatic.collect({tokenId: tokenIdNumber,
      recipient: ownerAddress, 
      amount0Max: MAX_UINT128, 
      amount1Max: MAX_UINT128}, {from: ownerAddress});

      const token0Exp = 10**token0.decimals; 
      const token0ExpStr = token0Exp.toString();
      var normalizedFee0 = divideAndFormat(results.amount0, token0ExpStr)

      const token1Exp = 10**token1.decimals; 
      const token1ExpStr = token1Exp.toString();
      var normalizedFee1 = divideAndFormat(results.amount1, token1ExpStr)

    return {
      'fee0': normalizedFee0,
      'fee1': normalizedFee1
    }
  }


  export function divideAndFormat(
    largeNumberStr: string,
    divisor: string,
    decimalPlaces: number = 6
  ): string {
    // Convert inputs to BigNumber
    const largeNumber = BigNumber.from(largeNumberStr);
    const bigDivisor = BigNumber.from(divisor);
  
    // Scale for decimal places
    const scale = BigNumber.from(10).pow(decimalPlaces);
    const scaledResult = largeNumber.mul(scale).div(bigDivisor);
  
    // Convert to string and format as decimal
    const scaledResultStr = scaledResult.toString();
    const integerPart = scaledResultStr.slice(0, -decimalPlaces) || "0";
    const fractionalPart = scaledResultStr.slice(-decimalPlaces).padStart(decimalPlaces, "0");
  
    return `${integerPart}.${fractionalPart}`;
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

      var rangeStatus = rangeFactor(
        position.tickLower, 
        position.tickUpper, 
        currentTick,
        token0Info.decimals,
        token1Info.decimals
      )
  
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

    const transaction = await buildTransaction(
      provider,
      wallet.address,
      tokenId,
      calldata,
      value,
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS
    );

    if (!safeMode) {
        return await executeTransaction(wallet, transaction);
    } else {
        return {
            'transactionHash': 'Running in Safe Mode so no Transaction Hash'
        }
    }
  }

  export async function buildTransaction(
    provider: any,
    walletAddress: string,
    tokenId: number,
    calldata: string,
    value: any,
    to: string,
  ) {
    let gasPrice;
    try {
        gasPrice = await provider.getGasPrice();
    } catch (error) {
        // console.error('An error occurred getting the gas price:', error);
        throw error;
    }

    console.log('gasPrice=' + gasPrice);
    console.log('gasLimit=' + ethers.BigNumber.from(tokenId));

    return {
        data: calldata,
        to: to,
        value: value,
        from: walletAddress,
        gasLimit: ethers.BigNumber.from(tokenId),
        gasPrice: gasPrice,
    };
  }

  export async function executeTransaction(wallet: any, transaction: any) {
    try {
        const tx = await wallet.sendTransaction(transaction);
        const receipt = await tx.wait();
        return receipt;
    } catch (error: any) {
        var errorBody = 'unknown'
        if (error?.body) {
            try {
                errorBody = 'JSON parsed. ' + JSON.stringify(JSON.parse(error.body));
                console.error("Error body:", errorBody);
            } catch (parseError) {
                errorBody = 'Unparsable JSON. Error=' + error.body;
                console.error("Error body could not be parsed:", error.body);
            }
        } else {
            errorBody = 'No error body. Error=' + error.message;
            console.error("Error message:", error.message);
        }

        return {
            'transactionHash': 'Error thrown so no transaction=' + errorBody
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

  export async function fetchPriceFromUniswap(
    address: string, 
    provider: ethers.providers.Provider,     
    decimalsToken0: number,
    decimalsToken1: number
  ): Promise<number> {
    // Connect to the Uniswap pool
    const poolContract = new ethers.Contract(address, UNISWAP_V3_POOL_ABI, provider);
  
    // Fetch the current slot0 data
    const { sqrtPriceX96 } = await poolContract.slot0();
  
    // Decode sqrtPriceX96 to get the price
    const price = decodePriceFromSqrtPriceX96(sqrtPriceX96, decimalsToken0, decimalsToken1); // USDC has 6 decimals, ETH has 18 decimals
    return price;
  }
  
  function decodePriceFromSqrtPriceX96(
    sqrtPriceX96: ethers.BigNumber,
    decimalsToken0: number,
    decimalsToken1: number
  ): number {
    // Square the sqrtPriceX96 to get the price ratio
    const numerator = sqrtPriceX96.mul(sqrtPriceX96); // BigNumber multiplication
    const denominator = ethers.BigNumber.from(2).pow(192); // 2^192 as BigNumber
    // Use higher precision by multiplying the numerator before division
    const scaledNumerator = numerator.mul(ethers.BigNumber.from(10).pow(18));
  
    const priceRatio = scaledNumerator.div(denominator); // Division with scaling
  
    // Adjust for token decimals
    const adjustedPrice = parseFloat(priceRatio.toString()) * 10 ** (decimalsToken0 - decimalsToken1 - 18);
  
    return adjustedPrice;
  }


  const CHAINLINK_ETH_USD_FEED = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";

// Chainlink Aggregator Interface
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
];


async function fetchETHPrice(provider: ethers.providers.Provider): Promise<number> {
  // Initialize the Chainlink price feed contract
  const priceFeed = new ethers.Contract(CHAINLINK_ETH_USD_FEED, CHAINLINK_ABI, provider);

  // Fetch the latest price data
  const { answer } = await priceFeed.latestRoundData();

  // Chainlink prices are scaled by 10^8 (8 decimals)
  const ethPriceInUSD = parseFloat(ethers.utils.formatUnits(answer, 8));
  return ethPriceInUSD;
}


export function getTickFromPrice(baseToken: typeof Token, quoteToken: typeof Token, value: string): typeof Price {
  const result = tryParsePrice(baseToken, quoteToken, value)
  console.log('Price result:', result)

  if (result) {
    const tick = priceToClosestTick(result)

    console.log('the tick=' + tick)

    return tick
  } else {
    return undefined
  }
}

export function tryParsePrice(baseToken: typeof Token, quoteToken: typeof Token, value: string): typeof Price {
  if (!baseToken || !quoteToken || !value) {
    return undefined
  }

  if (!value.match(/^\d*\.?\d+$/)) { // Check if value is a valid number
    return undefined
  }

  const [whole, fraction] = value.split('.')
  const decimals = fraction ? fraction.length : 0
  const withoutDecimals = JSBI.BigInt((whole || "") + (fraction || ""))

  const baseAmount = JSBI.multiply(JSBI.BigInt(10 ** decimals), JSBI.BigInt(10 ** baseToken.decimals))
  const quoteAmount = JSBI.multiply(withoutDecimals, JSBI.BigInt(10 ** quoteToken.decimals))

  
  const result = new Price(baseToken, quoteToken, baseAmount, quoteAmount);

  return result
}