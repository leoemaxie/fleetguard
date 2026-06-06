import * as cdk from "aws-cdk-lib";
import * as iot from "aws-cdk-lib/aws-iot";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface IoTStackProps extends cdk.StackProps {
  stage: string;
}

export class IoTStack extends cdk.Stack {
  public readonly telemetryQueue: sqs.Queue;
  public readonly alertQueue: sqs.Queue;
  public readonly aiInferenceQueue: sqs.Queue;
  public readonly criticalAlertTopic: sns.Topic;
  public readonly rawLogsBucket: s3.Bucket;
  public readonly firmwareBucket: s3.Bucket;
  public readonly reportsBucket: s3.Bucket;
  public readonly iotRuleRole: iam.Role;

  constructor(scope: Construct, id: string, props: IoTStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const isProd = stage === "prod";

    // ----------------------------------------------------------------
    // SQS Queues
    // All queues use server-side encryption (SQS-managed keys — free).
    // KMS-managed keys add $1/key/month; not worth it unless compliance demands it.
    // ----------------------------------------------------------------

    // Dead-letter queues first
    const telemetryDLQ = new sqs.Queue(this, "TelemetryDLQ", {
      queueName: `fleetguard-telemetry-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const alertDLQ = new sqs.Queue(this, "AlertDLQ", {
      queueName: `fleetguard-alert-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    const aiInferenceDLQ = new sqs.Queue(this, "AiInferenceDLQ", {
      queueName: `fleetguard-ai-inference-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(7),
    });

    // High-throughput GPS + fuel telemetry from IoT Core rules engine
    // visibilityTimeout must be > Telemetry Ingest Service processing time
    this.telemetryQueue = new sqs.Queue(this, "TelemetryQueue", {
      queueName: `fleetguard-telemetry-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.hours(24), // GPS data stales fast
      deadLetterQueue: {
        queue: telemetryDLQ,
        maxReceiveCount: 3,
      },
    });

    // Alert processing — rule-based checks (idle, private use, stops)
    this.alertQueue = new sqs.Queue(this, "AlertQueue", {
      queueName: `fleetguard-alert-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(120),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: alertDLQ,
        maxReceiveCount: 5,
      },
    });

    // LSTM inference requests — can tolerate higher latency
    this.aiInferenceQueue = new sqs.Queue(this, "AiInferenceQueue", {
      queueName: `fleetguard-ai-inference-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: aiInferenceDLQ,
        maxReceiveCount: 3,
      },
    });

    // ----------------------------------------------------------------
    // SNS Topics
    // Critical alerts fan-out: WebSocket service + push notifications +
    // future WhatsApp channel. Each subscriber adds independently.
    // ----------------------------------------------------------------
    this.criticalAlertTopic = new sns.Topic(this, "CriticalAlertTopic", {
      topicName: `fleetguard-critical-alerts-${stage}`,
      displayName: "FleetGuard Critical Alerts",
    });

    // SNS -> SQS subscription so alert-processing service can also consume
    // critical alerts asynchronously (fan-out pattern)
    this.criticalAlertTopic.addSubscription(
      new cdk.aws_sns_subscriptions.SqsSubscription(this.alertQueue, {
        rawMessageDelivery: true,
      })
    );

    // ----------------------------------------------------------------
    // S3 Buckets
    // ----------------------------------------------------------------

    // Raw OBU batch uploads (compressed JSON from SD card)
    this.rawLogsBucket = new s3.Bucket(this, "RawLogsBucket", {
      bucketName: `fleetguard-raw-logs-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: "ArchiveOldLogs",
          // Move to Infrequent Access after 30 days (~60% cheaper than Standard)
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              // Glacier after 90 days for compliance archival
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(365), // Hard delete after 1 year
        },
      ],
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // OTA firmware binaries — versioned, no expiry
    this.firmwareBucket = new s3.Bucket(this, "FirmwareBucket", {
      bucketName: `fleetguard-firmware-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Reports, evidence PDFs, trip exports
    this.reportsBucket = new s3.Bucket(this, "ReportsBucket", {
      bucketName: `fleetguard-reports-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: "ExpireOldReports",
          expiration: cdk.Duration.days(90),
        },
      ],
      cors: [
        {
          // Dashboard fetches presigned URLs directly from S3
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: isProd
            ? ["https://app.fleetguard.ng"]
            : ["http://localhost:3000", "https://*.fleetguard.ng"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // ----------------------------------------------------------------
    // AWS IoT Core
    //
    // IoT Core pricing: $0.08 per million messages (first 1B/mo).
    // A single OBU at 1Hz = 86,400 messages/day. 5 vehicles = 432,000/day.
    // At scale (500 vehicles) = 43M messages/day = ~$3.44/day in IoT Core.
    // Still far cheaper than running a Mosquitto cluster + ECS.
    //
    // Device authentication: X.509 certificates registered in IoT Core.
    // One cert per OBU, provisioned via IoT Just-in-Time Provisioning (JITP)
    // or manually during device manufacture for the pilot.
    // ----------------------------------------------------------------

    // IAM role that IoT Core rules engine assumes to write to SQS
    this.iotRuleRole = new iam.Role(this, "IoTRuleRole", {
      roleName: `fleetguard-iot-rule-${stage}`,
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
    });

    this.telemetryQueue.grantSendMessages(this.iotRuleRole);
    this.rawLogsBucket.grantPut(this.iotRuleRole);

    // IoT logging role for CloudWatch (troubleshooting device connectivity)
    const iotLoggingRole = new iam.Role(this, "IoTLoggingRole", {
      roleName: `fleetguard-iot-logging-${stage}`,
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSIoTLogging"
        ),
      ],
    });

    // IoT Logging configuration (L1 construct — no L2 available)
    new iot.CfnLogging(this, "IoTLogging", {
      accountId: this.account,
      defaultLogLevel: isProd ? "WARN" : "INFO",
      roleArn: iotLoggingRole.roleArn,
    });

    // IoT Topic Rule: GPS + fuel telemetry → SQS telemetry queue
    // Topic pattern: fg/+/+/gps and fg/+/+/fuel
    // SQL selects all fields and adds a server-side timestamp
    new iot.CfnTopicRule(this, "TelemetryRule", {
      ruleName: `fleetguard_telemetry_${stage}`,
      topicRulePayload: {
        sql: "SELECT *, timestamp() AS server_ts FROM 'fg/+/+/gps' OR 'fg/+/+/fuel'",
        awsIotSqlVersion: "2016-03-23",
        actions: [
          {
            sqs: {
              queueUrl: this.telemetryQueue.queueUrl,
              roleArn: this.iotRuleRole.roleArn,
              useBase64: false,
            },
          },
        ],
        errorAction: {
          // Failed rule actions go to CloudWatch Logs for investigation
          cloudwatchLogs: {
            logGroupName: `/fleetguard/iot/rule-errors`,
            roleArn: iotLoggingRole.roleArn,
          },
        },
        ruleDisabled: false,
      },
    });

    // IoT Topic Rule: Device alerts (tamper, geo-fence breach) → SQS alert queue
    new iot.CfnTopicRule(this, "DeviceAlertRule", {
      ruleName: `fleetguard_device_alerts_${stage}`,
      topicRulePayload: {
        sql: "SELECT *, timestamp() AS server_ts FROM 'fg/+/+/alert'",
        awsIotSqlVersion: "2016-03-23",
        actions: [
          {
            sqs: {
              queueUrl: this.alertQueue.queueUrl,
              roleArn: this.iotRuleRole.roleArn,
              useBase64: false,
            },
          },
        ],
        errorAction: {
          cloudwatchLogs: {
            logGroupName: `/fleetguard/iot/rule-errors`,
            roleArn: iotLoggingRole.roleArn,
          },
        },
        ruleDisabled: false,
      },
    });

    // IoT Topic Rule: Batch SD card uploads → S3 raw logs
    new iot.CfnTopicRule(this, "BatchUploadRule", {
      ruleName: `fleetguard_batch_upload_${stage}`,
      topicRulePayload: {
        sql: "SELECT * FROM 'fg/+/+/batch'",
        awsIotSqlVersion: "2016-03-23",
        actions: [
          {
            s3: {
              bucketName: this.rawLogsBucket.bucketName,
              // Partitioned by tenant/vehicle/date for efficient Athena queries later
              key: "raw/${topic(2)}/${topic(3)}/${parse_time('yyyy/MM/dd', timestamp())}/${newuuid()}.json.gz",
              roleArn: this.iotRuleRole.roleArn,
            },
          },
        ],
        errorAction: {
          cloudwatchLogs: {
            logGroupName: `/fleetguard/iot/rule-errors`,
            roleArn: iotLoggingRole.roleArn,
          },
        },
        ruleDisabled: false,
      },
    });

    // ----------------------------------------------------------------
    // CloudWatch Log Group for IoT rule errors
    // ----------------------------------------------------------------
    new logs.LogGroup(this, "IoTRuleErrorLogs", {
      logGroupName: "/fleetguard/iot/rule-errors",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "TelemetryQueueUrl", {
      value: this.telemetryQueue.queueUrl,
      exportName: "FleetGuard-TelemetryQueueUrl",
    });

    new cdk.CfnOutput(this, "RawLogsBucketName", {
      value: this.rawLogsBucket.bucketName,
      exportName: "FleetGuard-RawLogsBucket",
    });

    new cdk.CfnOutput(this, "FirmwareBucketName", {
      value: this.firmwareBucket.bucketName,
      exportName: "FleetGuard-FirmwareBucket",
    });

    new cdk.CfnOutput(this, "ReportsBucketName", {
      value: this.reportsBucket.bucketName,
      exportName: "FleetGuard-ReportsBucket",
    });

    new cdk.CfnOutput(this, "IoTEndpoint", {
      value: `https://iot.${this.region}.amazonaws.com`,
      description:
        "Use `aws iot describe-endpoint --endpoint-type iot:Data-ATS` for the device endpoint",
    });
  }
}
