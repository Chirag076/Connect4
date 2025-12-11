import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "connect4-analytics",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "analytics" });

let gameStartTimes = {}; 
let gameDurations = []; 

let winCount = {}; 

let gamesPerHour = {}; 
let gamesPerDay = {}; 

let userStats = {}; 


async function start() {
  await consumer.connect();
  console.log("📊 Consumer connected!");

  await consumer.subscribe({ topic: "connect4-events", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("📥 EVENT RECEIVED:", event);

      handleAnalytics(event);
    },
  });
}


function handleAnalytics(event) {
  const { type, timestamp } = event;

  let day = new Date(timestamp).toISOString().substring(0, 10); 
  let hour = new Date(timestamp).toISOString().substring(0, 13); 

  if (type === "game_started") {
    const gameId = `${event.player1}-${event.player2}`;
    gameStartTimes[gameId] = timestamp;

    gamesPerHour[hour] = (gamesPerHour[hour] || 0) + 1;
    gamesPerDay[day] = (gamesPerDay[day] || 0) + 1;

    userStats[event.player1] = userStats[event.player1] || {
      games: 0,
      wins: 0,
    };
    userStats[event.player2] = userStats[event.player2] || {
      games: 0,
      wins: 0,
    };

    userStats[event.player1].games++;
    userStats[event.player2].games++;
  }

  if (type === "game_ended") {
    const { winner, player1, player2, draw } = event;

    const gameId = `${player1}-${player2}`;
    const startTime = gameStartTimes[gameId];

    if (startTime) {
      const duration = (timestamp - startTime) / 1000; 
      gameDurations.push(duration);
      delete gameStartTimes[gameId];
    }

    if (!draw && winner) {
      userStats[winner] = userStats[winner] || { games: 0, wins: 0 };

      winCount[winner] = (winCount[winner] || 0) + 1;
      userStats[winner].wins++;
    }
  }

  printAnalytics();
}

function printAnalytics() {

  if (gameDurations.length > 0) {
    const avg = gameDurations.reduce((a, b) => a + b, 0) / gameDurations.length;
    console.log("Average Game Duration:", avg.toFixed(2), "seconds");
  }

  console.log("Wins:", winCount);

  console.log("Games per Hour:", gamesPerHour);

  console.log("Games per Day:", gamesPerDay);

  console.log("User Stats:", userStats);

}

start();
