import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  type Message,
  type SQSClient,
} from '@aws-sdk/client-sqs'

export async function receiveMessages(
  client: SQSClient,
  queueUrl: string,
  maxNumberOfMessages = 10,
): Promise<Message[]> {
  const result = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxNumberOfMessages,
      WaitTimeSeconds: 20,
      MessageAttributeNames: ['All'],
    }),
  )
  return result.Messages ?? []
}

export async function deleteMessage(
  client: SQSClient,
  queueUrl: string,
  receiptHandle: string,
): Promise<void> {
  await client.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  )
}

export async function sendMessage(
  client: SQSClient,
  queueUrl: string,
  payload: unknown,
): Promise<void> {
  await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  )
}
