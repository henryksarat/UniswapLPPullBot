import * as uniswap_functions from '../src/uniswap_functions'


describe('divideAndFormat tests', () => {  
    const testCases = [
      {
        description: 'large number that ends in 0 with decimals - using decimals in dividor similar to LINK',
        largeNumberStr: '98888888888888888',
        divisor: (10**18).toString(),
        decimalPlaces: 6,
        expectedResult: '0.098888'
      },
      {
        description: 'large number that is divided into 1 digit and decimals - using decimals in dividor similar to LINK',
        largeNumberStr: '9888888888888888888',
        divisor: (10**18).toString(),
        decimalPlaces: 6,
        expectedResult: '9.888888'
      },
      {
        description: 'small number that is divided into 1 digit and decimals - using decimals in dividor similar to USDC',
        largeNumberStr: '1234567',
        divisor: (10**6).toString(),
        decimalPlaces: 6,
        expectedResult: '1.234567'
      },
      {
        description: 'small number that is divided into 0 digit and decimals - using decimal in dividor similar to USDC',
        largeNumberStr: '12345',
        divisor: (10**6).toString(),
        decimalPlaces: 6,
        expectedResult: '0.012345'
      },
      {
        description: 'small number that is divided into 0 digit and decimals - using decimal in dividor similar to USDC - decimal places larger than divisor decimal',
        largeNumberStr: '12345',
        divisor: (10**6).toString(),
        decimalPlaces: 10,
        expectedResult: '0.0123450000'
      },
      {
        description: 'small number that is divided into 1 digit and decimals - using decimal in dividor similar to USDC - decimal places larger than divisor decimal',
        largeNumberStr: '1234567',
        divisor: (10**6).toString(),
        decimalPlaces: 10,
        expectedResult: '1.2345670000'
      },
      {
        description: 'zero number that is divided - using decimal in dividor similar to USDC',
        largeNumberStr: '0',
        divisor: (10**6).toString(),
        decimalPlaces: 10,
        expectedResult: '0.0000000000'
      },
    ];
  
    testCases.forEach(({ description, largeNumberStr, divisor, decimalPlaces, expectedResult }) => {
      test(description, () => {
        const result = uniswap_functions.divideAndFormat(
          largeNumberStr,
          divisor,
          decimalPlaces
        )
        
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('divideAndFormat tests with divisor 0', () => {  
      test('testing error message for divide by zero', () => {
        try {
          uniswap_functions.divideAndFormat(
            '1234567',
            (0).toString(),
            10
          )
        } catch (error: any) {
          expect(error.code).toBe("NUMERIC_FAULT"); 
          expect(error.fault).toBe("division-by-zero");
          expect(error.message).toContain("division-by-zero"); 
        }
      });
  });

  describe('rangeFactor tests', () => {  
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
