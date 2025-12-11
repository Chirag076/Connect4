import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "connect4-local",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

export async function connectKafka() {
  try {
    await producer.connect();
    console.log("Kafka connected locally!");
  } catch (err) {
    console.error("Kafka connection error:", err.message);
  }
}

export async function sendEvent(eventType, payload = {}) {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    ...payload
  };

  try {
    await producer.send({
      topic: "connect4-events",
      messages: [{ value: JSON.stringify(event) }],
    });

    console.log("Sent event:", event);
  } catch (err) {
    console.error("Kafka send error:", err.message);
  }
}
