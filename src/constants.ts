import { AssetType } from './types';

export const TRADING_PAIRS: Record<AssetType, string[]> = {
  Currency: [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
    'EURAUD', 'EURNZD', 'EURCAD', 'EURCHF', 'GBPAUD', 'GBPNZD', 'GBPCAD', 'GBPCHF',
    'AUDNZD', 'AUDCAD', 'AUDCHF', 'NZDCAD', 'NZDCHF', 'CADCHF'
  ],
  Crypto: [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'DOT', 'LTC',
    'SHIB', 'TRX', 'AVAX', 'LINK', 'UNI', 'ATOM', 'XLM', 'XMR', 'ETC', 'BCH',
    'FIL', 'HBAR', 'ICP', 'NEAR', 'VET', 'QNT', 'LDO', 'GRT', 'ALGO', 'SAND'
  ],
  Commodity: [
    'Gold (XAUUSD)', 'Silver (XAGUSD)', 'Crude Oil (WTI)', 'Brent Oil', 
    'Natural Gas', 'Copper', 'Platinum', 'Palladium', 'Corn', 'Wheat', 
    'Soybeans', 'Sugar', 'Coffee', 'Cotton'
  ]
};
