import * as fs from 'fs';
import path from 'path';
import * as util from 'util';

import { db } from '.';
import { Position } from './models/position.model';
import { Trader } from './models/trader.model';
import { TraderPerformance } from './models/trader_performance.model';
import { typeormInstance } from './typeorm-connection';

const readFile = util.promisify(fs.readFile);

interface TraderFromFile {
  futureUid: string;
  nickName: string;
  userPhotoUrl: string;
  rank: number;
  pnl: number;
  roi: number;
  positionShared: boolean;
  twitterUrl: null;
  encryptedUid: string;
  updateTime: number;
  followerCount: number;
  twShared: boolean;
  isTwTrader: boolean;
  openId: string;
  tradeType: string;
}

interface PerformanceRetList {
  periodType: string;
  statisticsType: string;
  value: number;
  rank: number;
}
interface TraderPerformanceFromFile {
  uid: string;
  performanceRetList: PerformanceRetList[];
  lastTradeTime: number;
}

interface PositionFromFile {
  symbol: string;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  roe: number;
  updateTime: number[];
  amount: number;
  updateTimeStamp: number;
  yellow: boolean;
  tradeBefore: boolean;
  leverage: number;
  uuid: string;
  tradeType: string;
  total_pnl: number;
  total_roi: number;
}

function paginateArray<T>(
  array: T[],
  page_size: number,
  page_number: number
): T[] {
  return array.slice((page_number - 1) * page_size, page_number * page_size);
}

async function readJsonArrayFromFile() {
  await db.manager.transaction(async (transaction) => {
    const tradersFile = await readFile(
      path.resolve(__dirname, '../../data/traders.json'),
      'utf-8'
    );
    const jsonArray: TraderFromFile[] = JSON.parse(tradersFile);

    if (!Array.isArray(jsonArray))
      throw new Error('The JSON file does not contain an array.');

    const traders = jsonArray.map((trader) => ({
      encryptedUid: trader.encryptedUid,
      futureUid: trader.futureUid,
      nickName: trader.nickName,
      userPhotoUrl: trader.userPhotoUrl,
      rank: trader.rank,
      pnl: trader.pnl,
      roi: trader.roi,
      positionShared: trader.positionShared,
      twitterUrl: trader.twitterUrl,
      updateTime: trader.updateTime,
      followerCount: trader.followerCount,
      twShared: trader.twShared,
      isTwTrader: trader.isTwTrader,
      openId: trader.openId,
      tradeType: trader.tradeType,
    }));

    for (let i = 1; paginateArray(traders, 500, i).length > 0; i += 1) {
      const tradersPage = paginateArray(traders, 500, i);
      await transaction.save(Trader, tradersPage as unknown as Trader[]);
    }

    const performanceFile = await readFile(
      path.resolve(__dirname, '../../data/traders_performance.json'),
      'utf-8'
    );
    const jsonArrayPerformances: TraderPerformanceFromFile[] =
      JSON.parse(performanceFile);

    if (!Array.isArray(jsonArrayPerformances))
      throw new Error('The JSON file does not contain an array.');

    for (const performance of jsonArrayPerformances) {
      for (const perf of performance.performanceRetList) {
        const trader = await transaction.findOne(Trader, {
          where: { encryptedUid: performance.uid },
        });
        if (!trader) throw new Error('Trader not found.');
        await transaction.save(TraderPerformance, {
          value: perf.value,
          rank: perf.rank,
          periodType: perf.periodType,
          statisticsType: perf.statisticsType,
          traderPK: trader.traderPK,
        });
      }
    }

    const positionsFile = await readFile(
      path.resolve(__dirname, '../../data/positions.json'),
      'utf-8'
    );
    const jsonArrayPositions: PositionFromFile[] = JSON.parse(positionsFile);

    if (!Array.isArray(jsonArrayPositions))
      throw new Error('The JSON file does not contain an array.');

    const positions = [];
    for (const position of jsonArrayPositions) {
      const updateTimeTemp = position.updateTime;
      let updateTime = new Date();
      if (updateTimeTemp.length > 0) {
        updateTimeTemp[1] -= 1;
        const milliseconds = updateTimeTemp[6] / 1000000;
        updateTimeTemp[6] = milliseconds;
        const [year, month, day, hours, minutes, seconds] = updateTimeTemp;
        const date = new Date(
          Date.UTC(year, month, day, hours, minutes, seconds)
        );
        updateTime = date;
      }

      const trader = await transaction.findOne(Trader, {
        where: { encryptedUid: position.uuid },
      });
      if (!trader) throw new Error('Trader not found.');

      if (!position.symbol) console.log(position);
      else
        positions.push({
          traderPK: trader?.traderPK,
          symbol: position.symbol,
          entryPrice: position.entryPrice,
          markPrice: position.markPrice,
          pnl: position.pnl,
          roe: position.roe,
          amount: position.amount,
          updateTime: updateTime,
          updateTimeStamp: position.updateTimeStamp,
          yellow: position.yellow,
          tradeBefore: position.tradeBefore,
          leverage: position.leverage,
          tradeType: position.tradeType,
        });
    }

    for (let i = 1; paginateArray(positions, 500, i).length > 0; i += 1) {
      const positionsPage = paginateArray(positions, 500, i);
      await transaction.save(Position, positionsPage as unknown as Position[]);
    }
  });
}

(async () => {
  await typeormInstance.connect();
  const jsonArray = await readJsonArrayFromFile();
  console.log('JSON Array from file:', jsonArray);
})();
