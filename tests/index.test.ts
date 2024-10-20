import * as index from '../index';
import * as uniswap_functions from '../src/uniswap_functions'

test('adds 1 + 2 to equal 3', async () => {
    expect(await index.add2(1, 2)).toBe(3);
});

describe('filterAndExecuteLiquidate tests', () => {
    let provider: undefined;
    let mockExecuteLiquidate: jest.SpyInstance;
  
    const createPositionInfo = (isOpen: boolean, token0Symbol: string, token1Symbol: string) => ({
      isOpen,
      token0: { symbol: token0Symbol },
      token1: { symbol: token1Symbol },
      rangeStatus: uniswap_functions.RANGE_STATUS.BELOW_RANGE,
    });
  
    beforeEach(() => {
      provider = undefined;
      mockExecuteLiquidate = jest.spyOn(index, 'executeLiquidate').mockImplementation();
    });
  
    afterEach(() => {
      mockExecuteLiquidate.mockRestore();
    });
  
    const testCases = [
      {
        description: 'should execute liquidation when position is open',
        isOpen: true,
        token0Symbol: 'ETH',
        token1Symbol: 'USDC',
        expectedResult: true,
        expectedCallCount: 1,
      },
      {
        description: 'should not execute liquidation when position is not open',
        isOpen: false,
        token0Symbol: 'ETH',
        token1Symbol: 'USDC',
        expectedResult: false,
        expectedCallCount: 0,
      },
      {
        description: 'should not execute liquidation when first symbol is different',
        isOpen: true,
        token0Symbol: 'ETH2',
        token1Symbol: 'USDC',
        expectedResult: false,
        expectedCallCount: 0,
      },
      {
        description: 'should not execute liquidation when second symbol is different',
        isOpen: true,
        token0Symbol: 'ETH',
        token1Symbol: 'USDC2',
        expectedResult: false,
        expectedCallCount: 0,
      },
    ];
  
    testCases.forEach(({ description, isOpen, token0Symbol, token1Symbol, expectedResult, expectedCallCount }) => {
      test(description, async () => {
        const positions = [createPositionInfo(isOpen, token0Symbol, token1Symbol)];
        const result = await index.filterAndExecuteLiquidate(provider, positions, 'ETH', 'USDC');
        expect(result).toEqual(expectedResult);
        expect(mockExecuteLiquidate).toHaveBeenCalledTimes(expectedCallCount);
      });
    });
  });
