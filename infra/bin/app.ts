#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FoundationStack } from "../lib/stacks/foundation-stack";
import { DataStack } from "../lib/stacks/data-stack";
import { IoTStack } from "../lib/stacks/iot-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  // Defaults to af-south-1 (Cape Town) — closest AWS region to Nigeria with Multi-AZ RDS.
  region: process.env.FLEETGUARD_REGION ?? "af-south-1",
};

const stage = app.node.tryGetContext("stage") ?? "prod";

// Stack 1: VPC, subnets, security groups, ECR repos — everything else depends on this
const foundation = new FoundationStack(app, "FleetGuard-Foundation", {
  env,
  stage,
  description: "FleetGuard VPC, networking, ECR repositories",
});

// Stack 2: RDS PostgreSQL (PostGIS + TimescaleDB), ElastiCache Redis
const data = new DataStack(app, "FleetGuard-Data", {
  env,
  stage,
  vpc: foundation.vpc,
  dbSecurityGroup: foundation.dbSecurityGroup,
  cacheSecurityGroup: foundation.cacheSecurityGroup,
  description: "FleetGuard RDS PostgreSQL + ElastiCache Redis",
});
data.addDependency(foundation);

// Stack 3: AWS IoT Core, SQS queues, SNS topics, S3 buckets, Secrets Manager
const iot = new IoTStack(app, "FleetGuard-IoT", {
  env,
  stage,
  description: "FleetGuard IoT Core, SQS, SNS, S3, Secrets",
});
iot.addDependency(foundation);

// Stack 4: ECS Fargate cluster + services, API Gateway, CloudFront
const compute = new ComputeStack(app, "FleetGuard-Compute", {
  env,
  stage,
  vpc: foundation.vpc,
  ecsSecurityGroup: foundation.ecsSecurityGroup,
  albSecurityGroup: foundation.albSecurityGroup,
  dbSecret: data.dbSecret,
  redisEndpoint: data.redisEndpoint,
  telemetryQueue: iot.telemetryQueue,
  alertQueue: iot.alertQueue,
  rawLogsBucket: iot.rawLogsBucket,
  firmwareBucket: iot.firmwareBucket,
  reportsBucket: iot.reportsBucket,
  description: "FleetGuard ECS Fargate services, API Gateway, CloudFront",
});
compute.addDependency(data);
compute.addDependency(iot);

cdk.Tags.of(app).add("Project", "FleetGuard");
cdk.Tags.of(app).add("Stage", stage);
cdk.Tags.of(app).add("ManagedBy", "CDK");
cdk.Tags.of(app).add("aws-apn-id", "pc:8l8gcn23lmlgammd8572tk6va");
cdk.Tags.of(app).add("event", "oneWithAI");
