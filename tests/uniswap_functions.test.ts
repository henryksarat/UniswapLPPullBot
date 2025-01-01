import * as uniswap_functions from '../src/uniswap_functions'
import { ethers } from 'ethers';

jest.mock('../config/uni_config', () => ({
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS: '0xMockedContractAddress'
}));

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

describe('executeTransaction', () => {
    const mockTransaction = {
        data: '0x123',
        to: '0x456',
        value: '0',
    };

    const testCases = [
        {
            description: 'should handle JSON error bodies',
            error: { 
                body: JSON.stringify({ error: 'Transaction failed' }) 
            },
            expectedErrorBody: 'JSON parsed. {"error":"Transaction failed"}'
        },
        {
            description: 'should handle non-JSON error bodies',
            error: { 
                body: 'Invalid error format' 
            },
            expectedErrorBody: 'Unparsable JSON. Error=Invalid error format'
        },
        {
            description: 'should handle errors without body property',
            error: { 
                message: 'Generic error message' 
            },
            expectedErrorBody: 'No error body. Error=Generic error message'
        }
    ];

    testCases.forEach(({ description, error, expectedErrorBody }) => {
        it(description, async () => {
            const mockWallet = {
                sendTransaction: jest.fn().mockRejectedValue(error)
            };

            const result = await uniswap_functions.executeTransaction(mockWallet, mockTransaction);
            
            expect(mockWallet.sendTransaction).toHaveBeenCalledWith(mockTransaction);
            expect(result).toEqual({
                'transactionHash': `Error thrown so no transaction=${expectedErrorBody}`
            });
        });
    });
});

describe('buildTransaction', () => {
    const testCases = [
        {
            description: 'should build transaction with correct gas price',
            mockGasPrice: '1000',
            tokenId: 123,
            calldata: '0xabcd',
            value: '100',
            walletAddress: '0x123',
            to: '0xMockedContractAddress',
            expectedTransaction: {
                data: '0xabcd',
                to: '0xMockedContractAddress',
                value: '100',
                from: '0x123',
                gasLimit: ethers.BigNumber.from(123),
                gasPrice: '1000'
            }
        },
        {
            description: 'should build transaction with zero value',
            mockGasPrice: '2000',
            tokenId: 456,
            calldata: '0xef12',
            value: '0',
            walletAddress: '0x456',
            to: '0xMockedContractAddress',
            expectedTransaction: {
                data: '0xef12',
                to: '0xMockedContractAddress',
                value: '0',
                from: '0x456',
                gasLimit: ethers.BigNumber.from(456),
                gasPrice: '2000'
            }
        }
    ];

    testCases.forEach(({ description, mockGasPrice, tokenId, calldata, value, walletAddress, to, expectedTransaction }) => {
        it(description, async () => {
            const mockProvider = {
                getGasPrice: jest.fn().mockResolvedValue(mockGasPrice)
            };

            const result = await uniswap_functions.buildTransaction(
                mockProvider,
                walletAddress,
                tokenId,
                calldata,
                value,
                to
            );

            expect(mockProvider.getGasPrice).toHaveBeenCalled();
            expect(result).toEqual(expectedTransaction);
        });
    });

    it('should throw error when gas price fetch fails', async () => {
        const mockProvider = {
            getGasPrice: jest.fn().mockRejectedValue(new Error('Gas price fetch failed'))
        };

        await expect(
          uniswap_functions.buildTransaction(
              mockProvider,
              '0x123',
              123,
              '0xabcd',
              '100',
              '0xMockedContractAddress'
          )
      ).rejects.toThrow('Gas price fetch failed');

      expect(mockProvider.getGasPrice).toHaveBeenCalled();
    });
});