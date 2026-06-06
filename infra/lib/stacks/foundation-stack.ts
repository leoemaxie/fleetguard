import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

interface FoundationStackProps extends cdk.StackProps {
  stage: string;
}

export class FoundationStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly cacheSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  // ECR repos — one per microservice. Build + push images separately.
  public readonly repositories: Record<string, ecr.Repository>;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // ----------------------------------------------------------------
    // VPC
    // 2 AZs to balance cost vs resilience. 3 AZs in production at scale.
    // NAT Gateways are the single biggest VPC cost line (~$32/month each).
    // One NAT Gateway covers both private subnets — acceptable for this stage.
    // ----------------------------------------------------------------
    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `fleetguard-${stage}`,
      maxAzs: 2,
      natGateways: 1, // Cost optimization: 1 NAT GW, ~$32/mo vs $64/mo for 2
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // VPC Flow Logs to CloudWatch — cheap, essential for debugging and compliance
    this.vpc.addFlowLog("FlowLog", {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.REJECT,
    });

    // ----------------------------------------------------------------
    // Security Groups
    // ----------------------------------------------------------------

    // ECS tasks — inbound from ALB only
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSG", {
      vpc: this.vpc,
      securityGroupName: `fleetguard-ecs-${stage}`,
      description: "FleetGuard ECS Fargate tasks",
      allowAllOutbound: true,
    });

    // RDS — inbound from ECS only
    this.dbSecurityGroup = new ec2.SecurityGroup(this, "DbSG", {
      vpc: this.vpc,
      securityGroupName: `fleetguard-db-${stage}`,
      description: "FleetGuard RDS PostgreSQL",
      allowAllOutbound: false,
    });
    this.dbSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ECS tasks to connect to Postgres"
    );

    // ElastiCache Redis — inbound from ECS only
    this.cacheSecurityGroup = new ec2.SecurityGroup(this, "CacheSG", {
      vpc: this.vpc,
      securityGroupName: `fleetguard-cache-${stage}`,
      description: "FleetGuard ElastiCache Redis",
      allowAllOutbound: false,
    });
    this.cacheSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(6379),
      "Allow ECS tasks to connect to Redis"
    );

    // ----------------------------------------------------------------
    // ECR Repositories — one per service
    // Images tagged by git SHA in CI. Keep last 10 images max.
    // ----------------------------------------------------------------
    const serviceNames = [
      "api-gateway",
      "telemetry-ingest",
      "alert-processing",
      "ai-inference",
      "websocket",
      "route-sync",
      "reporting",
      "auth",
    ];

    this.repositories = {};
    for (const name of serviceNames) {
      const repo = new ecr.Repository(this, `Ecr-${name}`, {
        repositoryName: `fleetguard/${name}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        lifecycleRules: [
          {
            maxImageCount: 10,
            description: "Keep last 10 images",
          },
        ],
        imageScanOnPush: true,
      });
      this.repositories[name] = repo;

      new cdk.CfnOutput(this, `EcrUri-${name}`, {
        value: repo.repositoryUri,
        exportName: `FleetGuard-Ecr-${name}`,
      });
    }

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: "FleetGuard-VpcId",
    });
  }
}
