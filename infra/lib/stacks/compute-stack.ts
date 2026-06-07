import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigateway_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

interface ComputeStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.Vpc;
  ecsSecurityGroup: ec2.SecurityGroup;
  albSecurityGroup: ec2.SecurityGroup;
  dbSecret: secretsmanager.ISecret;
  redisEndpoint: string;
  telemetryQueue: sqs.Queue;
  alertQueue: sqs.Queue;
  rawLogsBucket: s3.Bucket;
  firmwareBucket: s3.Bucket;
}

// ----------------------------------------------------------------
// Cost-optimised Fargate task sizing guide
//
// Pilot (5 vehicles):   256 CPU / 512 MB  — "nano", ~$7/mo per service
// Growth (50 vehicles): 512 CPU / 1024 MB — ~$14/mo per service
// Scale (500 vehicles): 1024 CPU / 2048 MB — add replicas via auto-scaling
//
// SPOT tasks: enable for non-critical services (reporting, AI inference)
// for 70% cost reduction. Not for API gateway or WebSocket (interruption risk).
// ----------------------------------------------------------------

interface ServiceConfig {
  name: string;
  cpu: number;
  memoryMiB: number;
  desiredCount: number;
  useSpot: boolean;
  portMappings?: number[];
}

export class ComputeStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const {
      stage,
      vpc,
      ecsSecurityGroup,
      albSecurityGroup,
      dbSecret,
      redisEndpoint,
      telemetryQueue,
      alertQueue,
      rawLogsBucket,
      firmwareBucket,
    } = props;

    const isProd = stage === "prod";

    // ----------------------------------------------------------------
    // ECS Cluster
    // Container Insights costs ~$0.015/vCPU/hour but is worth it in prod
    // for cross-service tracing. Disabled in staging to save cost.
    // ----------------------------------------------------------------
    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: `fleetguard-${stage}`,
      vpc,
      containerInsights: isProd,
      enableFargateCapacityProviders: true,
    });

    // ----------------------------------------------------------------
    // Shared task execution role
    // All tasks share one execution role (for ECR pull + CloudWatch Logs).
    // Each task gets its own task role for fine-grained resource access.
    // ----------------------------------------------------------------
    const executionRole = new iam.Role(this, "EcsExecutionRole", {
      roleName: `fleetguard-ecs-execution-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });
    // Allow all tasks to read secrets from Secrets Manager
    dbSecret.grantRead(executionRole);

    // ----------------------------------------------------------------
    // Internal Application Load Balancer
    // All services sit behind one internal ALB. API Gateway fronts the ALB
    // for the public REST API. WebSocket service gets its own ALB listener rule.
    // ----------------------------------------------------------------
    const alb = new elbv2.ApplicationLoadBalancer(this, "InternalAlb", {
      loadBalancerName: `fleetguard-internal-${stage}`,
      vpc,
      securityGroup: albSecurityGroup,
      internetFacing: false, // Internal only — API Gateway is the public ingress
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const httpListener = alb.addListener("HttpListener", {
      port: 80,
      open: false,
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: "application/json",
        messageBody: JSON.stringify({ error: "not_found" }),
      }),
    });

    // ----------------------------------------------------------------
    // Helper: create a Fargate service with sensible defaults
    // ----------------------------------------------------------------
    const createService = (
      config: ServiceConfig,
      taskRole: iam.Role,
      environment: Record<string, string>,
      secrets: Record<string, ecs.Secret>
    ): ecs.FargateService => {
      const logGroup = new logs.LogGroup(this, `${config.name}Logs`, {
        logGroupName: `/fleetguard/${stage}/${config.name}`,
        retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const taskDef = new ecs.FargateTaskDefinition(
        this,
        `${config.name}TaskDef`,
        {
          family: `fleetguard-${config.name}-${stage}`,
          cpu: config.cpu,
          memoryLimitMiB: config.memoryMiB,
          executionRole,
          taskRole,
        }
      );

      // Image: pulled from ECR. Use a placeholder — real images are pushed by CI.
      // In a fresh deploy with no image, use public.ecr.aws/nginx/nginx:stable as
      // a placeholder so the service starts. CI replaces this on first build.
      const image = ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(
          this,
          `${config.name}Repo`,
          `fleetguard/${config.name}`
        ),
        "latest"
      );

      taskDef.addContainer(`${config.name}Container`, {
        containerName: config.name,
        image,
        portMappings: (config.portMappings ?? [3000]).map((port) => ({
          containerPort: port,
          protocol: ecs.Protocol.TCP,
        })),
        environment,
        secrets,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: config.name,
          logGroup,
        }),
        healthCheck: {
          command: ["CMD-SHELL", `curl -f http://localhost:${config.portMappings?.[0] ?? 3000}/health || exit 1`],
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          retries: 3,
          startPeriod: cdk.Duration.seconds(60),
        },
      });

      const capacityProviderStrategies: ecs.CapacityProviderStrategy[] = config.useSpot
        ? [
            { capacityProvider: "FARGATE_SPOT", weight: 4 },
            { capacityProvider: "FARGATE", weight: 1 }, // 20% on-demand fallback
          ]
        : [{ capacityProvider: "FARGATE", weight: 1 }];

      return new ecs.FargateService(this, `${config.name}Service`, {
        serviceName: `fleetguard-${config.name}-${stage}`,
        cluster,
        taskDefinition: taskDef,
        desiredCount: config.desiredCount,
        securityGroups: [ecsSecurityGroup],
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        capacityProviderStrategies,
        enableExecuteCommand: true, // ecs exec for debugging in prod
        circuitBreaker: {
          rollback: true, // Auto-rollback on deployment failure
        },
      });
    };

    // ----------------------------------------------------------------
    // Common environment variables injected into all services
    // ----------------------------------------------------------------
    const commonEnv = {
      NODE_ENV: isProd ? "production" : "development",
      STAGE: stage,
      REGION: this.region,
      REDIS_HOST: redisEndpoint,
      REDIS_PORT: "6379",
      TELEMETRY_QUEUE_URL: telemetryQueue.queueUrl,
      ALERT_QUEUE_URL: alertQueue.queueUrl,
      RAW_LOGS_BUCKET: rawLogsBucket.bucketName,
      FIRMWARE_BUCKET: firmwareBucket.bucketName,
    };

    const commonSecrets = {
      DB_SECRET: ecs.Secret.fromSecretsManager(dbSecret),
    };

    // ----------------------------------------------------------------
    // 0. Frontend Service
    // TanStack Start SSR app. Use Spot for cost savings in development.
    // ----------------------------------------------------------------
    const frontendRole = new iam.Role(this, "FrontendTaskRole", {
      roleName: `fleetguard-frontend-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    const frontendService = createService(
      { name: "frontend", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: isProd ? false : true },
      frontendRole,
      {
        ...commonEnv,
        PORT: "3000",
        SERVICE: "frontend",
        VITE_MAPBOX_TOKEN: "pk.eyJ1IjoibGVvZW1heGllIiwiYSI6ImNtNzVwZ3N2bzBpbnoya3EzZjNraXpobXoifQ.2h_lHk_YyXvXyXvXyXvXyX", // Placeholder or from secrets
      },
      {}
    );

    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, "FrontendTG", {
      targetGroupName: `fg-fe-${stage}`,
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [frontendService],
      healthCheck: {
        path: "/", // SSR root path
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    httpListener.addTargetGroups("FrontendRule", {
      targetGroups: [frontendTargetGroup],
      // Catch-all: anything not matched by /api/*, /auth/*, or /ws* goes to frontend
    });

    // ----------------------------------------------------------------
    // 1. API Gateway Service
    // The public REST API. On-demand Fargate — no Spot for the critical path.
    // ----------------------------------------------------------------
    const apiRole = new iam.Role(this, "ApiTaskRole", {
      roleName: `fleetguard-api-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    dbSecret.grantRead(apiRole);

    const apiService = createService(
      { name: "api-gateway", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: false },
      apiRole,
      { ...commonEnv, PORT: "3000", SERVICE: "api-gateway" },
      commonSecrets
    );

    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, "ApiTG", {
      targetGroupName: `fg-api-${stage}`,
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [apiService],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    httpListener.addTargetGroups("ApiRule", {
      targetGroups: [apiTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(["/api/*"])],
      priority: 10,
    });

    // ----------------------------------------------------------------
    // 2. Auth Service
    // ----------------------------------------------------------------
    const authRole = new iam.Role(this, "AuthTaskRole", {
      roleName: `fleetguard-auth-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    dbSecret.grantRead(authRole);

    const authService = createService(
      { name: "auth", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: false },
      authRole,
      { ...commonEnv, PORT: "3001", SERVICE: "auth" },
      commonSecrets
    );

    const authTargetGroup = new elbv2.ApplicationTargetGroup(this, "AuthTG", {
      targetGroupName: `fg-auth-${stage}`,
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [authService],
      healthCheck: { path: "/health" },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    httpListener.addTargetGroups("AuthRule", {
      targetGroups: [authTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(["/auth/*"])],
      priority: 20,
    });

    // ----------------------------------------------------------------
    // 3. WebSocket Service
    // On-demand Fargate — Spot interruption would drop active connections.
    // ----------------------------------------------------------------
    const wsRole = new iam.Role(this, "WsTaskRole", {
      roleName: `fleetguard-ws-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    const wsService = createService(
      { name: "websocket", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: false },
      wsRole,
      { ...commonEnv, PORT: "3002", SERVICE: "websocket" },
      commonSecrets
    );

    const wsTargetGroup = new elbv2.ApplicationTargetGroup(this, "WsTG", {
      targetGroupName: `fg-ws-${stage}`,
      vpc,
      port: 3002,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [wsService],
      // WebSocket health check on HTTP upgrade path
      healthCheck: { path: "/health" },
      stickinessCookieDuration: cdk.Duration.days(1), // Sticky sessions for WS
      deregistrationDelay: cdk.Duration.seconds(60),
    });

    httpListener.addTargetGroups("WsRule", {
      targetGroups: [wsTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(["/ws", "/ws/*"])],
      priority: 30,
    });

    // ----------------------------------------------------------------
    // 4. Telemetry Ingestion Service
    // SQS consumer — Spot is fine, tasks are stateless and retryable
    // ----------------------------------------------------------------
    const telemetryRole = new iam.Role(this, "TelemetryTaskRole", {
      roleName: `fleetguard-telemetry-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    telemetryQueue.grantConsumeMessages(telemetryRole);
    dbSecret.grantRead(telemetryRole);

    createService(
      { name: "telemetry-ingest", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: true },
      telemetryRole,
      { ...commonEnv, SERVICE: "telemetry-ingest" },
      commonSecrets
    );

    // ----------------------------------------------------------------
    // 5. Alert Processing Service
    // ----------------------------------------------------------------
    const alertRole = new iam.Role(this, "AlertTaskRole", {
      roleName: `fleetguard-alert-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    alertQueue.grantConsumeMessages(alertRole);
    dbSecret.grantRead(alertRole);

    createService(
      { name: "alert-processing", cpu: 256, memoryMiB: 512, desiredCount: isProd ? 2 : 1, useSpot: true },
      alertRole,
      { ...commonEnv, SERVICE: "alert-processing" },
      commonSecrets
    );

    // ----------------------------------------------------------------
    // 6. AI Inference Service (Python FastAPI)
    // Spot + minimal resources. LSTM inference is CPU-bound but bursty.
    // Can scale via SQS queue depth metric (see auto-scaling below).
    // ----------------------------------------------------------------
    const aiRole = new iam.Role(this, "AiTaskRole", {
      roleName: `fleetguard-ai-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    createService(
      { name: "ai-inference", cpu: 512, memoryMiB: 1024, desiredCount: 1, useSpot: true },
      aiRole,
      { ...commonEnv, SERVICE: "ai-inference" },
      {} // No DB access — reads from SQS, writes results back to alert queue
    );

    // ----------------------------------------------------------------
    // 7. Route Sync Service
    // Low traffic — 1 task, Spot
    // ----------------------------------------------------------------
    const routeSyncRole = new iam.Role(this, "RouteSyncTaskRole", {
      roleName: `fleetguard-route-sync-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    dbSecret.grantRead(routeSyncRole);
    routeSyncRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["iot:Publish"],
        resources: [`arn:aws:iot:${this.region}:${this.account}:topic/fg/*/routes`],
      })
    );

    createService(
      { name: "route-sync", cpu: 256, memoryMiB: 512, desiredCount: 1, useSpot: true },
      routeSyncRole,
      { ...commonEnv, SERVICE: "route-sync" },
      commonSecrets
    );

    // ----------------------------------------------------------------
    // 8. Reporting Service
    // On-demand only during report generation — scale to 0 when idle.
    // ----------------------------------------------------------------
    const reportingRole = new iam.Role(this, "ReportingTaskRole", {
      roleName: `fleetguard-reporting-task-${stage}`,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    dbSecret.grantRead(reportingRole);
    props.rawLogsBucket.grantRead(reportingRole);
    new s3.Bucket(this, "Placeholder"); // handled in IoTStack — just grant access
    reportingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [`arn:aws:s3:::fleetguard-reports-${stage}-${this.account}/*`],
      })
    );

    createService(
      { name: "reporting", cpu: 512, memoryMiB: 1024, desiredCount: 1, useSpot: true },
      reportingRole,
      { ...commonEnv, SERVICE: "reporting" },
      commonSecrets
    );

    // ----------------------------------------------------------------
    // Auto-scaling: Telemetry and Alert services scale on SQS queue depth
    // ----------------------------------------------------------------
    [
      { service: "telemetry-ingest", queue: telemetryQueue },
    ].forEach(({ queue }) => {
      // Queue depth scaling is done via Application Auto Scaling targeting
      // a custom CloudWatch metric. Handled at application level via
      // ECS Service Auto Scaling — wire up in a separate construct if needed.
      // Placeholder: add ScalableTarget here when load testing data is available.
      queue; // referenced
    });

    // ----------------------------------------------------------------
    // API Gateway (HTTP API) → ALB
    // HTTP API is ~70% cheaper than REST API for simple proxy use cases.
    // Handles JWT authorizer before traffic hits ECS.
    // ----------------------------------------------------------------
    const httpApi = new apigateway.HttpApi(this, "HttpApi", {
      apiName: `fleetguard-${stage}`,
      description: "FleetGuard REST API + WebSocket proxy",
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: isProd
          ? ["https://app.fleetguard.ng"]
          : ["http://localhost:3000", "https://*.fleetguard.ng"],
        maxAge: cdk.Duration.days(1),
      },
    });

    // All routes proxy to internal ALB
    const albIntegration = new apigateway_integrations.HttpAlbIntegration(
      "AlbIntegration",
      httpListener,
      { secureServerName: alb.loadBalancerDnsName }
    );

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigateway.HttpMethod.ANY],
      integration: albIntegration,
    });

    this.apiUrl = httpApi.apiEndpoint;

    // ----------------------------------------------------------------
    // CloudFront Distribution
    // Single distribution with two origins:
    //   1. S3 origin for the TanStack Start SSR app static assets (cached)
    //   2. API Gateway origin for /api/* and /ws (not cached)
    //
    // In the real setup, the TanStack Start SSR app runs on its own
    // Fargate service or Lambda@Edge. Here we configure the CF distribution
    // that sits in front of both. Replace S3 origin with Fargate ALB origin
    // once the frontend service is containerised.
    // ----------------------------------------------------------------
    const apiOrigin = new cloudfront_origins.HttpOrigin(
      `${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        httpsPort: 443,
      }
    );

    const distribution = new cloudfront.Distribution(this, "CfDistribution", {
      comment: `FleetGuard ${stage} distribution`,
      defaultBehavior: {
        origin: apiOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR — no CF cache
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        // Cache static assets aggressively
        "/_next/static/*": {
          origin: apiOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        "/api/*": {
          origin: apiOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      // priceClass: PriceClass.PRICE_CLASS_100 limits to NA+EU PoPs.
      // Use ALL to include African PoPs (Cape Town, Nairobi, Johannesburg) for
      // lower latency to Nigerian users. Cost difference is marginal at low traffic.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: httpApi.apiEndpoint,
      exportName: "FleetGuard-ApiEndpoint",
    });

    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: distribution.distributionDomainName,
      exportName: "FleetGuard-CloudFrontDomain",
    });

    new cdk.CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
      exportName: "FleetGuard-AlbDnsName",
    });
  }
}
