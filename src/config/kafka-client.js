import { Kafka } from "kafkajs";

export const kafkaClient = new Kafka({
  clientId: "chaicode",
  brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
});
