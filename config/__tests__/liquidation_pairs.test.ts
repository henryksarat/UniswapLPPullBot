import { LIQUIDATION_PAIRS, BASE_PAIRS_ARRAY } from '../liquidation_pairs';

describe('LIQUIDATION_PAIRS', () => {
    it('should contain all base pairs and their reverses', () => {
        for (const basePair of BASE_PAIRS_ARRAY) {
            expect(LIQUIDATION_PAIRS).toContainEqual(basePair);
            expect(LIQUIDATION_PAIRS).toContainEqual({ 
                token0: basePair.token1, 
                token1: basePair.token0 
            });
        }
    });

    it('should have twice the number of base pairs', () => {
        expect(LIQUIDATION_PAIRS).toHaveLength(BASE_PAIRS_ARRAY.length * 2);
    });

    it('should not have duplicate pairs', () => {
        const stringifiedPairs = LIQUIDATION_PAIRS.map(pair => 
            JSON.stringify({ token0: pair.token0, token1: pair.token1 })
        );
        const uniquePairs = new Set(stringifiedPairs);
        expect(uniquePairs.size).toBe(LIQUIDATION_PAIRS.length);
    });
});