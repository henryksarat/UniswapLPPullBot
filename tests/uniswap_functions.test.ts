import * as uniswap_functions from '../src/uniswap_functions'


describe('rangeFactor tests', () => {
    // let provider: undefined;
    // let mockExecuteLiquidate: jest.SpyInstance;
  
    // const createPositionInfo = (isOpen: boolean, token0Symbol: string, token1Symbol: string) => ({
    //   isOpen,
    //   token0: { symbol: token0Symbol },
    //   token1: { symbol: token1Symbol },
    //   rangeStatus: uniswap_functions.RANGE_STATUS.BELOW_RANGE,
    // });
  
    // beforeEach(() => {
    //   provider = undefined;
    //   mockExecuteLiquidate = jest.spyOn(index, 'executeLiquidate').mockImplementation();
    // });
  
    // afterEach(() => {
    //   mockExecuteLiquidate.mockRestore();
    // });
  
    const testCases = [
      {
        description: 'WETH/USDC example above range',
        tickLower: -195480,
        tickUpper: -195270,
        currentTick: -195194,
        decimal0: 18,
        decimal1: 6,
        expectedResult: uniswap_functions.RANGE_STATUS.ABOVE_RANGE
      },
      {
        description: 'WETH/USDC example below range',
        tickLower: -195480,
        tickUpper: -195270,
        currentTick: -195481,
        decimal0: 18,
        decimal1: 6,
        expectedResult: uniswap_functions.RANGE_STATUS.BELOW_RANGE
      },
      {
        description: 'WETH/USDC example within range',
        tickLower: -195480,
        tickUpper: -195270,
        currentTick: -195275,
        decimal0: 18,
        decimal1: 6,
        expectedResult: uniswap_functions.RANGE_STATUS.IN_RANGE
      },
      {
        description: 'USDC/LINK example below range',
        tickLower: 245160,
        tickUpper: 245400,
        currentTick: 245914,
        decimal0: 6,
        decimal1: 18,
        expectedResult: uniswap_functions.RANGE_STATUS.BELOW_RANGE
      },
      {
        description: 'USDC/LINK example above range',
        tickLower: 245160,
        tickUpper: 245400,
        currentTick: 24000,
        decimal0: 6,
        decimal1: 18,
        expectedResult: uniswap_functions.RANGE_STATUS.ABOVE_RANGE
      },
      {
        description: 'USDC/LINK example within range',
        tickLower: 245160,
        tickUpper: 245400,
        currentTick: 245200,
        decimal0: 6,
        decimal1: 18,
        expectedResult: uniswap_functions.RANGE_STATUS.IN_RANGE
      },
    ];
  
    testCases.forEach(({ description, tickLower, tickUpper, currentTick, decimal0, decimal1, expectedResult }) => {
      test(description, () => {
        const result = uniswap_functions.rangeFactor(
          tickLower,
          tickUpper,
          currentTick,
          decimal0,
          decimal1
        )
        
        expect(result).toEqual(expectedResult);
      });
    });
  });
