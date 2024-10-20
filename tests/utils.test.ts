import * as utils from '../src/utils';

test('test Human Readable', async () => {
    
    // I made a USDC/ETH Pool and and these were the tickets given when I
    // made the min of the pool be 2,617.59 USDC per ETH and the 
    // max be 2,643.9 USDC per Eth
    const ETH_DECIMALS = 18
    const USDC_DECIMALS = 6
    const MAX_TICK = -197620
    const MIN_TICK = -197520

    const resultOfMin = utils.getHumanReadableFromTick(MIN_TICK, ETH_DECIMALS, USDC_DECIMALS)
    expect(resultOfMin).toEqual([0.00037822978504465244, 2643.895429552021])

    const resultOfMax = utils.getHumanReadableFromTick(MAX_TICK, ETH_DECIMALS, USDC_DECIMALS)
    expect(resultOfMax).toEqual([0.00038203086657781255, 2617.5895391853596])
});
