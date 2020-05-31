const crypto = require("crypto");

const crashHash = "";
// Hash from bitcoin block #610546. Public seed event: https://twitter.com/Roobet/status/1211800855223123968
const salt = "0000000000000000000fa3b65e43e4240d71762a5bf397d5304b2596d116859c";

function saltHash(hash) {
  return crypto.createHmac("sha256", hash).update(salt).digest("hex");
}

function generateHash(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function divisible(hash, mod) {
  // We will read in 4 hex at a time, but the first chunk might be a bit smaller
  // So ABCDEFGHIJ should be chunked like  AB CDEF GHIJ
  var val = 0;

  var o = hash.length % 4;
  for (var i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
}

function crashPointFromHash(serverSeed) {
  const hash = crypto
    .createHmac("sha256", serverSeed)
    .update(salt)
    .digest("hex");

  const hs = parseInt(100 / 3);
  if (divisible(hash, hs)) {
    return 1;
  }

  const h = parseInt(hash.slice(0, 52 / 4), 16);
  const e = Math.pow(2, 52);

  return Math.floor((100 * e - h) / (e - h)) / 100.0;
}

function getPreviousGames(n) {
  const previousGames = [];
  let gameHash = generateHash(crashHash);

  for (let i = 0; i < n; i++) {
    const gameResult = crashPointFromHash(gameHash);
    previousGames.push(gameResult);
    gameHash = generateHash(gameHash);
  }

  return previousGames;
}

function calculateWinRate(games, moreThan) {
  let wins = 0;

  for (let i = 0; i < games.length; i++) {
    if (games[i] > moreThan) {
      wins++;
    }
  }

  return { ratio: wins / games.length, wins, losses: games.length - wins };
}

function verifyCrash({ startingCash, bet, multiplier, previousGames }) {
  const { ratio, wins, losses } = calculateWinRate(previousGames, multiplier);

  const finalCash = calculateFinalCash({
    startingCash,
    games: previousGames,
    multiplier,
    bet,
  });

  if (finalCash > 100 * startingCash) {
    // console.log(`Win ratio for ${multiplier} multiplier: ${winRatio * 100} `);
    console.log(
      `Started with: ${startingCash}, finished with: ${finalCash}. multiplier: ${bet} for ${
        multiplier + 0.000001
      }%. Wins: ${wins}, losses: ${losses}. Win Ratio: ${ratio}`
    );
  }

  return { finalCash, startingCash, bet, multiplier, ratio, wins, losses };
}

function calculateFinalCash({ startingCash, games, multiplier, bet }) {
  let total = startingCash;

  for (let i = games.length - 1; i >= 0; i--) {
    if (total < 0) {
      return total;
    }
    if (games[i] > multiplier) {
      total += multiplier * bet - bet;
    } else {
      total -= bet;
    }
  }
  return total;
}

function tryAll() {
  const previousGames = getPreviousGames(3000);
  previousGames.push(1.0, 1.0, 1.0);

  let Ws = [];

  for (let startingCash = 50; startingCash < 500; startingCash += 5) {
    for (let bet = 0.5; bet < 20; bet += 0.5) {
      for (let multiplier = 1.01; multiplier < 4; multiplier += 0.01) {
        const result = verifyCrash({
          startingCash,
          bet,
          multiplier,
          previousGames,
        });
        if (result.finalCash > result.startingCash) {
          Ws.push({
            finalCash: result.finalCash,
            startingCash: result.startingCash,
            bet: result.bet,
            multiplier: result.multiplier,
            ratio: result.ratio,
            wins: result.wins,
            losses: result.losses,
          });
        }
      }
    }
  }

  getHighestMultiplier(Ws);
  getHighestDifference(Ws);
}

function getHighestMultiplier(Ws) {
  let hihest = 0;
  let WIndex = 0;
  for (let i = 0; i < Ws.length; i++) {
    if (Ws[i].finalCash / Ws[i].startingCash > hihest) {
      hihest = Ws[i].finalCash / Ws[i].startingCash;
      WIndex = i;
    }
  }
  console.log(Ws[WIndex]);
}

function getHighestDifference(Ws) {
  let hihest = 0;
  let WIndex = 0;
  for (let i = 0; i < Ws.length; i++) {
    if (Ws[i].finalCash - Ws[i].startingCash > hihest) {
      hihest = Ws[i].finalCash - Ws[i].startingCash;
      WIndex = i;
    }
  }
  console.log(Ws[WIndex]);
}

tryAll();
