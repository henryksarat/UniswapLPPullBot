const BASE_PAIRS = [
    { token0: 'WETH', token1: 'USDC' },
    { token0: 'WBTC', token1: 'USDC' },
    { token0: 'USDC', token1: 'LINK' }
] as const;

export type BasePair = typeof BASE_PAIRS[number];
export const BASE_PAIRS_ARRAY = BASE_PAIRS;

export const LIQUIDATION_PAIRS = [
    ...BASE_PAIRS,
    ...BASE_PAIRS.map(pair => ({ token0: pair.token1, token1: pair.token0 }))
];